import { Injectable, BadRequestException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DoctorSchedule, Slot } from './schedule.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentStatus } from '../common/index';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(DoctorSchedule)
    private readonly repo: Repository<DoctorSchedule>,
    @InjectRepository(Appointment)
    private readonly appointmentsRepo: Repository<Appointment>,
    private readonly settingsService: SettingsService,
  ) {}

  private addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const hours = Math.floor((total % (24 * 60)) / 60);
    const mins = total % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  private normalizeRange(startTime: string, endTime?: string, defaultDuration = 30) {
    const safeStart = (startTime || '').slice(0, 5);
    const safeEnd = (endTime || '').slice(0, 5);
    const normalizedStart = safeStart || '08:00';
    const normalizedEnd = safeEnd || this.addMinutes(normalizedStart, defaultDuration);
    const fixedEnd = normalizedEnd === normalizedStart
      ? this.addMinutes(normalizedStart, defaultDuration)
      : normalizedEnd;
    return { startTime: normalizedStart, endTime: fixedEnd };
  }

  private normalizeToDate(date: string | Date): Date {
    if (date instanceof Date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  async getDaySchedule(doctorId: string, date: string | Date) {
    const dateObj = this.normalizeToDate(date);

    let sched = await this.repo.findOne({ where: { doctorId, date: dateObj } });

    const dateStr =
      dateObj instanceof Date
        ? dateObj.toISOString().split('T')[0]
        : String(dateObj);

    const baseSlots = await this.getDefaultSlotsFromSettings(doctorId, dateObj);
    const storedSlots = sched?.slots || [];
    const appointmentSlots = await this.getBookedSlots(doctorId, dateObj);
    const mergedSlots = this.mergeSlots(baseSlots, storedSlots, appointmentSlots);

    // Auto-block past-time available slots
    const today = this.normalizeToDate(new Date());
    const isPastDay = dateObj.getTime() < today.getTime();

    const toDateTime = (d: Date, time: string) => {
      const [h, m] = (time || '').slice(0,5).split(':').map(Number);
      const dt = new Date(d);
      dt.setHours(h || 0, m || 0, 0, 0);
      return dt;
    };

    const now = new Date();
    const finalSlots = mergedSlots.map((s) => {
      if (s.status !== 'available') return s;
      if (isPastDay) return { ...s, status: 'blocked' };
      const end = s.endTime || s.startTime || s.time || '';
      const endDt = toDateTime(dateObj, end);
      if (endDt.getTime() < now.getTime()) {
        return { ...s, status: 'blocked' };
      }
      return s;
    });

    return { date: dateStr, slots: finalSlots };
  }
  async setSingleSlotStatus(
    doctorId: string,
    date: string | Date,
    time: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
  ) {
    const range = this.normalizeRange(time, undefined);
    return this.saveSlot(doctorId, date, range.startTime, range.endTime, status, reason);
  }

  async setRangeSlotStatus(
    doctorId: string,
    date: string | Date,
    startTime: string,
    endTime: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
  ) {
    const range = this.normalizeRange(startTime, endTime);
    return this.saveSlot(
      doctorId,
      date,
      range.startTime,
      range.endTime,
      status,
      reason,
    );
  }

  // Public overloads: support legacy single time and new start/end range
  async setSlotStatus(
    doctorId: string,
    date: string | Date,
    time: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
  ): Promise<{ success: boolean; slot: Slot }>;
  async setSlotStatus(
    doctorId: string,
    date: string | Date,
    startTime: string,
    endTime: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
  ): Promise<{ success: boolean; slot: Slot }>;
  async setSlotStatus(
    doctorId: string,
    date: string | Date,
    arg3: string,
    arg4: string | 'available' | 'blocked' | 'booked',
    arg5?: 'available' | 'blocked' | 'booked' | string,
    arg6?: string,
  ): Promise<{ success: boolean; slot: Slot }> {
    const isStatus = (v: any): v is 'available' | 'blocked' | 'booked' =>
      v === 'available' || v === 'blocked' || v === 'booked';

    if (isStatus(arg4)) {
      const time = arg3;
      const status = arg4;
      const reason = typeof arg5 === 'string' ? arg5 : undefined;
      const range = this.normalizeRange(time);
      return this.saveSlot(doctorId, date, range.startTime, range.endTime, status, reason);
    }

    const startTime = arg3;
    const endTime = String(arg4);
    const status = (arg5 as 'available' | 'blocked' | 'booked') ?? 'available';
    const reason = arg6;
    const range = this.normalizeRange(startTime, endTime);
    return this.saveSlot(doctorId, date, range.startTime, range.endTime, status, reason);
  }


  private async saveSlot(
    doctorId: string,
    date: string | Date,
    startTime: string,
    endTime: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
  ): Promise<{ success: boolean; slot: Slot }> {
    const { startTime: safeStart, endTime: safeEnd } = this.normalizeRange(
      startTime,
      endTime,
    );
    const dateObj = this.normalizeToDate(date);

    // Prevent modifying past time slots
    const localEnd = new Date(dateObj);
    const [eh, em] = safeEnd.split(':').map(Number);
    localEnd.setHours((eh || 0), (em || 0), 0, 0);
    if (localEnd.getTime() < Date.now()) {
      throw new BadRequestException('Cannot modify past time slot');
    }

    let sched = await this.repo.findOne({
      where: { doctorId, date: dateObj },
    });

    if (!sched) {
      sched = this.repo.create({
        doctorId,
        date: dateObj,
        slots: [],
      });
    }

    const slots = sched.slots || [];

    let slot = slots.find(
      (s) => s.startTime === safeStart && s.endTime === safeEnd,
    );

    if (!slot) {
      slot = {
        startTime: safeStart,
        endTime: safeEnd,
        status,
        appointmentId: null,
        blockedReason: status === 'blocked' ? reason ?? null : null,
      };
      slots.push(slot);
    } else {
      slot.status = status;
      slot.blockedReason = status === 'blocked' ? reason ?? null : null;
      if (status !== 'booked') {
        slot.appointmentId = null;
      }
    }

    sched.slots = slots;
    await this.repo.save(sched);

    return { success: true, slot };
  }

  private async getBookedSlots(doctorId: string, date: Date): Promise<Slot[]> {
    const dateStr = date.toISOString().split('T')[0];
    const bookedStatuses = [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING];

    const appointments = await this.appointmentsRepo.find({
      where: {
        doctorId,
        appointmentDate: dateStr as any,
        status: In(bookedStatuses) as any,
      },
    });

    return appointments.map((apt) => {
      const startTime = this.normalizeRange(this.toTimeString(apt.appointmentTime)).startTime;
      const endTime = this.addMinutes(startTime, apt.duration ?? 30);
      return {
        startTime,
        endTime,
        status: 'booked',
        appointmentId: apt.id,
      } as Slot;
    });
  }

  private mergeSlots(...groups: Slot[][]): Slot[] {
    const priority: Record<string, number> = { booked: 3, blocked: 2, available: 1 };
    const map = new Map<string, Slot>();

    const upsert = (raw: Slot) => {
      const normalized = this.normalizeRange(raw.startTime || raw.time || '', raw.endTime);
      const key = `${normalized.startTime}-${normalized.endTime}`;
      const current = map.get(key);
      const incoming = {
        ...raw,
        startTime: normalized.startTime,
        endTime: normalized.endTime,
      } as Slot;

      if (!current) {
        map.set(key, incoming);
        return;
      }

      const currentPriority = priority[current.status] ?? 0;
      const incomingPriority = priority[incoming.status] ?? 0;

      if (incomingPriority >= currentPriority) {
        map.set(key, { ...current, ...incoming, status: incoming.status });
      }
    };

    groups.forEach((list) => list.forEach(upsert));

    return Array.from(map.values()).sort((a, b) =>
      (a.startTime || '').localeCompare(b.startTime || ''),
    );
  }

  private async getDefaultSlotsFromSettings(
    doctorId: string,
    date: Date,
  ): Promise<Slot[]> {
    const settings = await this.settingsService.getSettings(doctorId).catch(() => null);
    if (!settings || !settings.startTime || !settings.endTime) return [];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    const availableDays = settings.availableDays || [];
    if (availableDays.length && !availableDays.includes(dayName)) return [];

    const duration = settings.appointmentDuration || 30;
    const slots: Slot[] = [];
    let current = settings.startTime.slice(0, 5);
    const end = settings.endTime.slice(0, 5);

    while (current < end) {
      const next = this.addMinutes(current, duration);
      slots.push({ startTime: current, endTime: next, status: 'available' });
      current = next;
    }

    return slots;
  }

  private toTimeString(t: any): string {
    if (!t) return '';
    if (t instanceof Date) return t.toTimeString().slice(0, 5);
    return String(t).slice(0, 5);
  }

  async getMonthlyOverview(doctorId: string, year: number, month: number) {
    const mm = String(month).padStart(2, '0');
    const start = `${year}-${mm}-01`;
    const last = new Date(year, month, 0).getDate();
    const end = `${year}-${mm}-${String(last).padStart(2, '0')}`;

    const startDate = this.normalizeToDate(start);
    const endDate = this.normalizeToDate(end);

    const docs = await this.repo
      .createQueryBuilder('s')
      .where('s.doctorId = :doctorId', { doctorId })
      .andWhere('s.date BETWEEN :start AND :end', {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      })
      .getMany();

    const blockedDays = docs
      .filter((d) => d.slots.some((s: any) => s.status === 'blocked'))
      .map((d) =>
        d.date instanceof Date
          ? d.date.toISOString().split('T')[0]
          : String(d.date),
      );

    return { blockedDays, count: docs.length };
  }

  async getBlockedDays(doctorId: string, year: number, month: number) {
    const overview = await this.getMonthlyOverview(doctorId, year, month);
    return overview.blockedDays;
  }

  // ===== Working days (availability) =====
  private numberToDayName(n: number): string | null {
    const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return n >= 0 && n < 7 ? names[n] : null;
  }

  private dayNameToNumber(name: string): number | null {
    const map: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    return name in map ? map[name] : null;
  }

  async getDoctorWorkingDays(doctorId: string): Promise<number[]> {
    const settings = await this.settingsService.getSettings(doctorId).catch(() => null);
    const names = settings?.availableDays || [];
    return names
      .map((n) => this.dayNameToNumber(n))
      .filter((v): v is number => typeof v === 'number')
      .sort((a, b) => a - b);
  }

  async updateDoctorWorkingDays(doctorId: string, days: number[]): Promise<{ success: boolean; days: number[] }>{
    const names = (days || [])
      .map((d) => this.numberToDayName(d))
      .filter((n): n is string => !!n);

    await this.settingsService.updateSettings(doctorId, { availableDays: names });
    return { success: true, days: days.sort((a, b) => a - b) };
  }
}
