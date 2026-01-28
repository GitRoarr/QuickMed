import { Injectable, BadRequestException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DoctorSchedule, Slot } from './schedule.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentStatus } from '../common/index';
import { SettingsService } from '../settings/settings.service';
import { AvailabilityTemplateService } from './availability-template.service';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { ApplyTemplateDto } from './dto/apply-template.dto';
import { BulkSlotUpdateDto } from './dto/bulk-slot-update.dto';

const SESSIONS = {
  morning: { start: '09:00', end: '12:00', allowSlots: true },
  break: { start: '12:00', end: '14:00', allowSlots: false },
  evening: { start: '14:00', end: '20:00', allowSlots: true },
};

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(DoctorSchedule)
    private readonly repo: Repository<DoctorSchedule>,
    @InjectRepository(Appointment)
    private readonly appointmentsRepo: Repository<Appointment>,
    private readonly settingsService: SettingsService,
    private readonly templateService: AvailabilityTemplateService,
  ) { }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private fromMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private generateSlots(start: string, end: string, duration: number): string[] {
    const slots: string[] = [];
    let current = this.toMinutes(start);
    const endTime = this.toMinutes(end);

    while (current + duration <= endTime) {
      slots.push(this.fromMinutes(current));
      current += duration;
    }

    return slots;
  }

  private getDaySlots(availability: { sessions: any; slotDuration: number }): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    for (const session in availability.sessions) {
      if (!availability.sessions[session]) continue;

      const config = (SESSIONS as any)[session];
      if (!config || !config.allowSlots) continue;

      result[session] = this.generateSlots(
        config.start,
        config.end,
        availability.slotDuration,
      );
    }

    return result;
  }

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
    const dateStr = dateObj instanceof Date ? dateObj.toISOString().split('T')[0] : String(dateObj);

    // If session-based availability is defined, generate slots from sessions
    let sessionSlots: Slot[] = [];
    if (sched?.sessions) {
      const generated = this.getDaySlots({
        sessions: sched.sessions,
        slotDuration: sched.slotDuration || 30,
      });

      for (const session in generated) {
        generated[session].forEach((timeStr) => {
          const startTime = timeStr;
          const endTime = this.addMinutes(timeStr, sched?.slotDuration || 30);
          sessionSlots.push({
            startTime,
            endTime,
            status: 'available',
          });
        });
      }
    }

    // Manual-only: use stored slots and booked appointments; do not auto-generate from settings
    const storedSlots = sched?.slots || [];
    const appointmentSlots = await this.getBookedSlots(doctorId, dateObj);
    let mergedSlots = this.mergeSlots(sessionSlots, storedSlots, appointmentSlots);

    // Auto-block past-time available slots
    const today = this.normalizeToDate(new Date());
    const isPastDay = dateObj.getTime() < today.getTime();
    const toDateTime = (d: Date, time: string) => {
      const [h, m] = (time || '').slice(0, 5).split(':').map(Number);
      const dt = new Date(d);
      dt.setHours(h || 0, m || 0, 0, 0);
      return dt;
    };
    const now = new Date();
    const finalSlots: Slot[] = mergedSlots.map((s) => {
      if (s.status !== 'available') return s;
      if (isPastDay) return { ...s, status: 'blocked' as const };
      const end = s.endTime || s.startTime || s.time || '';
      const endDt = toDateTime(dateObj, end);
      if (endDt.getTime() < now.getTime()) {
        return { ...s, status: 'blocked' as const };
      }
      return s;
    });
    return {
      date: dateStr,
      slots: finalSlots,
      sessions: sched?.sessions || null,
      slotDuration: sched?.slotDuration || 30,
    };
  }

  async updateSessionAvailability(
    doctorId: string,
    date: string | Date,
    sessions: { morning: boolean; break: boolean; evening: boolean },
    slotDuration: number = 30,
  ) {
    const dateObj = this.normalizeToDate(date);
    let sched = await this.repo.findOne({ where: { doctorId, date: dateObj } });

    if (!sched) {
      sched = this.repo.create({
        doctorId,
        date: dateObj,
        slots: [],
      });
    }

    sched.sessions = sessions;
    sched.slotDuration = slotDuration;

    // Creative Enhancement: Automatically update doctor settings if sessions expand their windows
    try {
      let minStart = 1440; // 24h in mins
      let maxEnd = 0;
      let hasActiveSession = false;

      for (const [key, active] of Object.entries(sessions)) {
        if (active) {
          const config = (SESSIONS as any)[key];
          if (config) {
            hasActiveSession = true;
            const start = this.toMinutes(config.start);
            const end = this.toMinutes(config.end);
            if (start < minStart) minStart = start;
            if (end > maxEnd) maxEnd = end;
          }
        }
      }

      if (hasActiveSession) {
        const updateSettings: any = {};
        updateSettings.startTime = this.fromMinutes(minStart);
        updateSettings.endTime = this.fromMinutes(maxEnd);

        // Sync these to global settings to prevent validation mismatches
        await this.settingsService.updateSettings(doctorId, updateSettings);
      }
    } catch (e) {
      console.warn('Failed to sync settings with sessions', e);
    }

    try {
      await this.repo.save(sched);
      return this.getDaySchedule(doctorId, date);
    } catch (error) {
      console.error('Error saving session availability:', error);
      throw error;
    }
  }
  async setSingleSlotStatus(
    doctorId: string,
    date: string | Date,
    time: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
    appointmentId?: string | null,
  ) {
    const range = this.normalizeRange(time, undefined);
    return this.saveSlot(doctorId, date, range.startTime, range.endTime, status, reason, appointmentId);
  }

  async setRangeSlotStatus(
    doctorId: string,
    date: string | Date,
    startTime: string,
    endTime: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
    appointmentId?: string | null,
  ) {
    const range = this.normalizeRange(startTime, endTime);
    return this.saveSlot(
      doctorId,
      date,
      range.startTime,
      range.endTime,
      status,
      reason,
      appointmentId,
    );
  }

  // Public overloads: support legacy single time and new start/end range
  async setSlotStatus(
    doctorId: string,
    date: string | Date,
    time: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
    appointmentId?: string | null,
  ): Promise<{ success: boolean; slot: Slot }>;
  async setSlotStatus(
    doctorId: string,
    date: string | Date,
    startTime: string,
    endTime: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
    appointmentId?: string | null,
  ): Promise<{ success: boolean; slot: Slot }>;
  async setSlotStatus(
    doctorId: string,
    date: string | Date,
    arg3: string,
    arg4: string | 'available' | 'blocked' | 'booked',
    arg5?: 'available' | 'blocked' | 'booked' | string,
    arg6?: string,
    arg7?: string | null,
  ): Promise<{ success: boolean; slot: Slot }> {
    const isStatus = (v: any): v is 'available' | 'blocked' | 'booked' =>
      v === 'available' || v === 'blocked' || v === 'booked';

    if (isStatus(arg4)) {
      const time = arg3;
      const status = arg4;
      const reason = typeof arg5 === 'string' ? arg5 : undefined;
      const appointmentId = typeof arg6 === 'string' ? arg6 : (arg6 === null ? null : undefined);
      const range = this.normalizeRange(time);
      return this.saveSlot(doctorId, date, range.startTime, range.endTime, status, reason, appointmentId);
    }

    const startTime = arg3;
    const endTime = String(arg4);
    const status = (arg5 as 'available' | 'blocked' | 'booked') ?? 'available';
    const reason = typeof arg6 === 'string' ? arg6 : undefined;
    const appointmentId = typeof arg7 === 'string' ? arg7 : (arg7 === null ? null : undefined);
    const range = this.normalizeRange(startTime, endTime);
    return this.saveSlot(doctorId, date, range.startTime, range.endTime, status, reason, appointmentId);
  }


  private async saveSlot(
    doctorId: string,
    date: string | Date,
    startTime: string,
    endTime: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
    appointmentId?: string | null,
  ): Promise<{ success: boolean; slot: Slot }> {
    const { startTime: safeStart, endTime: safeEnd } = this.normalizeRange(
      startTime,
      endTime,
    );
    const dateObj = this.normalizeToDate(date);

    // Prevent modifying past time slots (unless it's marking as booked from appointment creation)
    if (status !== 'booked') {
      const localEnd = new Date(dateObj);
      const [eh, em] = safeEnd.split(':').map(Number);
      localEnd.setHours((eh || 0), (em || 0), 0, 0);
      if (localEnd.getTime() < Date.now()) {
        throw new BadRequestException('Cannot modify past time slot');
      }
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

    // Find slot that overlaps with this time range
    let slot = slots.find((s) => {
      const sStart = this.normalizeRange(s.startTime || s.time || '', s.endTime).startTime;
      const sEnd = this.normalizeRange(s.startTime || s.time || '', s.endTime).endTime;
      // Check if times overlap
      return (safeStart >= sStart && safeStart < sEnd) ||
        (safeEnd > sStart && safeEnd <= sEnd) ||
        (safeStart <= sStart && safeEnd >= sEnd);
    });

    if (!slot) {
      slot = {
        startTime: safeStart,
        endTime: safeEnd,
        status,
        appointmentId: appointmentId ?? (status === 'booked' ? null : null),
        blockedReason: status === 'blocked' ? reason ?? null : null,
      };
      slots.push(slot);
    } else {
      slot.status = status;
      slot.blockedReason = status === 'blocked' ? reason ?? null : null;
      if (status === 'booked') {
        slot.appointmentId = appointmentId ?? slot.appointmentId;
      } else {
        slot.appointmentId = null;
      }
      // Update time range to match
      slot.startTime = safeStart;
      slot.endTime = safeEnd;
    }

    sched.slots = slots;
    await this.repo.save(sched);

    return { success: true, slot };
  }

  async removeSlot(
    doctorId: string,
    date: string | Date,
    startTime: string,
    endTime?: string,
  ): Promise<{ success: boolean }> {
    const { startTime: safeStart, endTime: safeEnd } = this.normalizeRange(startTime, endTime);
    const dateObj = this.normalizeToDate(date);

    const sched = await this.repo.findOne({ where: { doctorId, date: dateObj } });
    if (!sched) return { success: true };

    const before = (sched.slots || []).length;
    sched.slots = (sched.slots || []).filter(
      (s) => !(s.startTime === safeStart && s.endTime === safeEnd),
    );

    if ((sched.slots || []).length === 0) {
      await this.repo.remove(sched);
    } else if ((sched.slots || []).length !== before) {
      await this.repo.save(sched);
    }

    return { success: true };
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

    const dayIndex = date.getDay();
    const workingDayNumbers = settings.workingDays || [];
    if (workingDayNumbers.length > 0 && !workingDayNumbers.includes(dayIndex)) {
      return [];
    }

    const duration = settings.appointmentDuration || 30;
    const slots: Slot[] = [];
    let current = settings.startTime.slice(0, 5);
    const end = settings.endTime.slice(0, 5);

    while (current < end) {
      const next = this.addMinutes(current, duration);
      if (next <= end) {
        slots.push({
          startTime: current,
          endTime: next,
          status: 'available',
        });
      }
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

  private numberToDayName(n: number): string | null {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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

  async updateDoctorWorkingDays(
    doctorId: string,
    days: number[],
  ): Promise<{ success: boolean; days: number[] }> {
    if (!doctorId) {
      throw new BadRequestException('Doctor id missing for working days update');
    }

    const safeDays = Array.isArray(days)
      ? days
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      : [];

    const sortedDays = [...safeDays].sort((a, b) => a - b);

    await this.settingsService.updateSettings(doctorId, {
      workingDays: sortedDays,
    });

    return { success: true, days: sortedDays };
  }

  async getWeekSchedule(doctorId: string, startDate: string): Promise<{ date: string; slots: Slot[] }[]> {
    const start = this.normalizeToDate(startDate);
    const weekDays: { date: string; slots: Slot[] }[] = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      const daySchedule = await this.getDaySchedule(doctorId, dateStr);
      weekDays.push(daySchedule);
    }

    return weekDays;
  }

  async getAvailableDates(doctorId: string, startDate: string, days: number = 30): Promise<string[]> {
    const start = this.normalizeToDate(startDate);
    const availableDates: string[] = [];

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      const daySchedule = await this.getDaySchedule(doctorId, dateStr);
      const hasAvailable = daySchedule.slots.some(slot => {
        if (slot.status !== 'available') return false;

        const today = this.normalizeToDate(new Date());
        if (currentDate.getTime() < today.getTime()) return false;

        const slotEnd = slot.endTime || slot.startTime || slot.time || '';
        const [h, m] = (slotEnd || '').slice(0, 5).split(':').map(Number);
        const slotDateTime = new Date(currentDate);
        slotDateTime.setHours(h || 0, m || 0, 0, 0);

        return slotDateTime.getTime() >= Date.now();
      });

      if (hasAvailable) {
        availableDates.push(dateStr);
      }
    }

    return availableDates;
  }

  /**
   * Generate slots for a day or date range based on time parameters
   */
  async generateSlotsForDay(
    doctorId: string,
    dto: GenerateSlotsDto,
  ): Promise<{ date: string; slots: Slot[] }[]> {
    const startDate = this.normalizeToDate(dto.date);
    const endDate = dto.endDate ? this.normalizeToDate(dto.endDate) : startDate;
    const slotDuration = dto.slotDuration || 30;
    const bufferMinutes = dto.bufferMinutes || 0;
    const breaks = dto.breaks || [];

    const results: { date: string; slots: Slot[] }[] = [];

    // Generate slots for each day in the range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const slots: Slot[] = [];
      let currentTime = dto.startTime;

      while (currentTime < dto.endTime) {
        const slotEnd = this.addMinutes(currentTime, slotDuration);

        // Check if this slot overlaps with a break
        const isBreak = breaks.some(
          (b) => currentTime < b.endTime && slotEnd > b.startTime,
        );

        if (!isBreak && slotEnd <= dto.endTime) {
          slots.push({
            startTime: currentTime,
            endTime: slotEnd,
            status: 'available',
          });
        }

        currentTime = this.addMinutes(slotEnd, bufferMinutes);
      }

      // Save the generated slots
      const dateStr = currentDate.toISOString().split('T')[0];
      await this.bulkSaveSlots(doctorId, currentDate, slots);
      results.push({ date: dateStr, slots });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
  }

  /**
   * Helper method to save multiple slots at once
   */
  private async bulkSaveSlots(
    doctorId: string,
    date: Date,
    slots: Slot[],
  ): Promise<void> {
    let sched = await this.repo.findOne({
      where: { doctorId, date: this.normalizeToDate(date) },
    });

    if (!sched) {
      sched = this.repo.create({
        doctorId,
        date: this.normalizeToDate(date),
        slots: [],
      });
    }

    // Merge with existing slots (don't overwrite booked slots)
    const existingSlots = sched.slots || [];
    const bookedSlots = existingSlots.filter((s) => s.status === 'booked');

    // Merge new slots with booked slots
    const mergedSlots = this.mergeSlots(bookedSlots, slots);
    sched.slots = mergedSlots;

    await this.repo.save(sched);
  }

  /**
   * Apply a template to specific dates or date range
   */
  async applyTemplateToDateRange(
    doctorId: string,
    dto: ApplyTemplateDto,
  ): Promise<{ date: string; slots: Slot[] }[]> {
    // Get the template
    const template = await this.templateService.getTemplate(
      dto.templateId,
      doctorId,
    );

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    const startDate = this.normalizeToDate(dto.startDate);
    const endDate = dto.endDate
      ? this.normalizeToDate(dto.endDate)
      : startDate;

    const results: { date: string; slots: Slot[] }[] = [];

    // Apply template to each day in the range
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      // Only generate slots if this day is in the template's working days
      if (template.workingDays.includes(dayOfWeek)) {
        const slots: Slot[] = [];
        let currentTime = template.startTime;

        while (currentTime < template.endTime) {
          const slotEnd = this.addMinutes(
            currentTime,
            template.slotDuration || 30,
          );

          // Check if this slot overlaps with a break
          const isBreak = (template.breaks || []).some(
            (b) => currentTime < b.endTime && slotEnd > b.startTime,
          );

          if (!isBreak && slotEnd <= template.endTime) {
            slots.push({
              startTime: currentTime,
              endTime: slotEnd,
              status: 'available',
            });
          }

          currentTime = this.addMinutes(
            slotEnd,
            template.bufferMinutes || 0,
          );
        }

        // Save the generated slots
        const dateStr = currentDate.toISOString().split('T')[0];
        await this.bulkSaveSlots(doctorId, currentDate, slots);
        results.push({ date: dateStr, slots });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
  }

  /**
   * Bulk update slot statuses within a time range
   */
  async bulkUpdateSlotStatus(
    doctorId: string,
    dto: BulkSlotUpdateDto,
  ): Promise<{ success: boolean; updatedSlots: number }> {
    const dateObj = this.normalizeToDate(dto.date);
    const { startTime: safeStart, endTime: safeEnd } = this.normalizeRange(
      dto.startTime,
      dto.endTime,
    );

    let sched = await this.repo.findOne({
      where: { doctorId, date: dateObj },
    });

    if (!sched) {
      // No schedule exists, create new slots if status is available or blocked
      if (dto.status === 'booked') {
        throw new BadRequestException(
          'Cannot book slots that do not exist',
        );
      }

      sched = this.repo.create({
        doctorId,
        date: dateObj,
        slots: [],
      });
    }

    let updatedCount = 0;
    const slots = sched.slots || [];

    // Find all slots that fall within the time range
    for (const slot of slots) {
      const slotStart = slot.startTime || slot.time || '';
      const slotEnd = slot.endTime || slotStart;

      // Check if slot overlaps with the update range
      const overlaps =
        (slotStart >= safeStart && slotStart < safeEnd) ||
        (slotEnd > safeStart && slotEnd <= safeEnd) ||
        (slotStart <= safeStart && slotEnd >= safeEnd);

      if (overlaps) {
        // Don't update booked slots unless explicitly allowing
        if (slot.status === 'booked' && dto.status !== 'booked') {
          continue;
        }

        slot.status = dto.status;
        slot.blockedReason =
          dto.status === 'blocked' ? dto.reason || null : null;
        slot.appointmentId =
          dto.status === 'booked' ? dto.appointmentId || null : null;
        updatedCount++;
      }
    }

    // If no slots exist in this range, create them
    if (updatedCount === 0 && dto.status !== 'booked') {
      // Generate slots for this time range with default duration
      let currentTime = safeStart;
      const slotDuration = 30; // Default duration

      while (currentTime < safeEnd) {
        const slotEnd = this.addMinutes(currentTime, slotDuration);
        if (slotEnd <= safeEnd) {
          slots.push({
            startTime: currentTime,
            endTime: slotEnd,
            status: dto.status,
            blockedReason:
              dto.status === 'blocked' ? dto.reason || null : null,
          });
          updatedCount++;
        }
        currentTime = slotEnd;
      }
    }

    sched.slots = slots;
    await this.repo.save(sched);

    return { success: true, updatedSlots: updatedCount };
  }

  /**
   * Get detailed week schedule with appointment info
   */
  async getWeekScheduleDetailed(
    doctorId: string,
    startDate: string,
  ): Promise<
    {
      date: string;
      dayOfWeek: number;
      slots: Slot[];
      appointmentCount: number;
      availableCount: number;
      blockedCount: number;
    }[]
  > {
    const start = this.normalizeToDate(startDate);
    const weekDays = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      const daySchedule = await this.getDaySchedule(doctorId, dateStr);

      const appointmentCount = daySchedule.slots.filter(
        (s) => s.status === 'booked',
      ).length;
      const availableCount = daySchedule.slots.filter(
        (s) => s.status === 'available',
      ).length;
      const blockedCount = daySchedule.slots.filter(
        (s) => s.status === 'blocked',
      ).length;

      weekDays.push({
        date: dateStr,
        dayOfWeek: currentDate.getDay(),
        slots: daySchedule.slots,
        appointmentCount,
        availableCount,
        blockedCount,
      });
    }

    return weekDays;
  }

  /**
   * Get month overview with stats per day
   */
  async getMonthScheduleOverview(
    doctorId: string,
    year: number,
    month: number,
  ): Promise<
    {
      date: string;
      appointmentCount: number;
      availableCount: number;
      blockedCount: number;
      hasSlots: boolean;
    }[]
  > {
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const days = [];

    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${mm}-${String(day).padStart(2, '0')}`;
      const daySchedule = await this.getDaySchedule(doctorId, dateStr);

      const appointmentCount = daySchedule.slots.filter(
        (s) => s.status === 'booked',
      ).length;
      const availableCount = daySchedule.slots.filter(
        (s) => s.status === 'available',
      ).length;
      const blockedCount = daySchedule.slots.filter(
        (s) => s.status === 'blocked',
      ).length;

      days.push({
        date: dateStr,
        appointmentCount,
        availableCount,
        blockedCount,
        hasSlots: daySchedule.slots.length > 0,
      });
    }

    return days;
  }

}

