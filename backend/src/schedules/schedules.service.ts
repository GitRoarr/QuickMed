import { Injectable, BadRequestException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DoctorSchedule, Slot, Shift, Break, ShiftStatus } from './schedule.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentStatus } from '../common/index';
import { SettingsService } from '../settings/settings.service';
import { AvailabilityTemplateService } from './availability-template.service';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { ApplyTemplateDto } from './dto/apply-template.dto';
import { BulkSlotUpdateDto } from './dto/bulk-slot-update.dto';
import { AutoScheduleInitializerService } from './auto-schedule-initializer.service';

import { ReceptionistTask } from '../receptionist/entities/receptionist-task.entity';

import { NotificationIntegrationService } from '../notifications/notification-integration.service';
import { UserRole } from '../common/index';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(DoctorSchedule)
    private readonly repo: Repository<DoctorSchedule>,
    @InjectRepository(Appointment)
    private readonly appointmentsRepo: Repository<Appointment>,
    @InjectRepository(ReceptionistTask)
    private readonly taskRepo: Repository<ReceptionistTask>,
    private readonly settingsService: SettingsService,
    private readonly templateService: AvailabilityTemplateService,
    private readonly autoInitializer: AutoScheduleInitializerService,
    private readonly notificationIntegration: NotificationIntegrationService,
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

  private generateSlots(shifts: Shift[], breaks: Break[]): Slot[] {
    const slots: Slot[] = [];
    if (!shifts) return slots;

    for (const shift of shifts) {
      if (!shift.enabled) continue;

      let current = this.toMinutes(shift.startTime);
      const end = this.toMinutes(shift.endTime);
      const duration = shift.slotDuration || 30;

      while (current + duration <= end) {
        const startTime = this.fromMinutes(current);
        const endTime = this.fromMinutes(current + duration);

        const isBreak = (breaks || []).some(
          b => this.toMinutes(startTime) < this.toMinutes(b.endTime) && this.toMinutes(endTime) > this.toMinutes(b.startTime)
        );

        if (!isBreak) {
          slots.push({
            startTime,
            endTime,
            status: 'available',
          });
        }
        current += duration;
      }
    }
    return slots;
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

  private formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async getDaySchedule(doctorId: string, date: string | Date) {
    const dateObj = this.normalizeToDate(date);

    await this.autoInitializer.autoInitializeScheduleIfNeeded(doctorId, dateObj);

    let sched = await this.repo.findOne({ where: { doctorId, date: dateObj } });
    const dateStr = this.formatLocalDate(dateObj);

    let generatedSlots: Slot[] = [];
    if (sched?.shifts) {
      generatedSlots = this.generateSlots(sched.shifts, sched.breaks);
    }

    const storedSlots = sched?.slots || [];
    const appointmentSlots = await this.getBookedSlots(doctorId, dateObj);
    const breakSlots: Slot[] = (sched?.breaks || []).map(b => ({
      ...b,
      status: 'break'
    }));

    let mergedSlots = this.mergeSlots(generatedSlots, storedSlots, appointmentSlots, breakSlots);

    const today = this.normalizeToDate(new Date());
    const isPastDay = dateObj.getTime() < today.getTime();
    const now = new Date();

    const finalSlots: Slot[] = mergedSlots.map((s) => {
      if (s.status !== 'available') return s;
      if (isPastDay) return { ...s, status: 'blocked' as const };

      const [h, m] = (s.endTime || '').slice(0, 5).split(':').map(Number);
      const endDt = new Date(dateObj);
      endDt.setHours(h || 0, m || 0, 0, 0);

      if (endDt.getTime() < now.getTime()) {
        return { ...s, status: 'blocked' as const };
      }
      return s;
    });

    const isToday = dateObj.getTime() === today.getTime();
    const shiftsWithStatus = (sched?.shifts || []).map(shift => ({
      ...shift,
      status: this.computeShiftStatus(shift, dateObj, isToday, now),
    }));

    return {
      date: dateStr,
      isToday,
      isPastDay,
      slots: finalSlots,
      shifts: shiftsWithStatus,
      breaks: sched?.breaks || [],
    };
  }

  private computeShiftStatus(shift: Shift, dateObj: Date, isToday: boolean, now: Date): ShiftStatus {
    if (!isToday) {
      const today = this.normalizeToDate(new Date());
      if (dateObj.getTime() < today.getTime()) return 'past';
      return 'upcoming';
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [endH, endM] = (shift.endTime || '').split(':').map(Number);
    const shiftEndMinutes = (endH || 0) * 60 + (endM || 0);
    const [startH, startM] = (shift.startTime || '').split(':').map(Number);
    const shiftStartMinutes = (startH || 0) * 60 + (startM || 0);

    if (currentMinutes >= shiftEndMinutes) return 'past';
    if (currentMinutes >= shiftStartMinutes && currentMinutes < shiftEndMinutes) return 'active';
    return 'upcoming';
  }

  async updateShiftsAndBreaks(
    doctorId: string,
    date: string | Date,
    shifts: Shift[],
    breaks: Break[],
  ) {
    console.log('[UpdateShiftsAndBreaks] start', {
      doctorId,
      date,
      shifts,
      breaks,
    });
    const dateObj = this.normalizeToDate(date);
    const today = this.normalizeToDate(new Date());
    const now = new Date();
    const isToday = dateObj.getTime() === today.getTime();
    const isPastDay = dateObj.getTime() < today.getTime();

    if (isPastDay) {
      throw new BadRequestException('Cannot modify schedule for past dates');
    }

    // Validate sequential shift times
    this.validateShiftSequence(shifts);

    // Validate breaks are within shift boundaries
    this.validateBreaks(breaks, shifts);

    // If today, prevent enabling shifts that have already fully passed
    if (isToday) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      for (const shift of shifts) {
        const [endH, endM] = (shift.endTime || '').split(':').map(Number);
        const shiftEndMinutes = (endH || 0) * 60 + (endM || 0);
        if (shift.enabled && currentMinutes >= shiftEndMinutes) {
          shift.enabled = false;
        }
      }
    }

    let sched = await this.repo.findOne({ where: { doctorId, date: dateObj } });

    if (!sched) {
      sched = this.repo.create({
        doctorId,
        date: dateObj,
        slots: [],
        shifts,
        breaks,
      });
    } else {
      sched.shifts = shifts;
      sched.breaks = breaks;
    }

    try {
      await this.repo.save(sched);

      // Perform conflict detection against existing appointments
      await this.detectAndNotifyConflicts(doctorId, dateObj, shifts, breaks);

      console.log('[UpdateShiftsAndBreaks] saved schedule', {
        id: sched.id,
        doctorId: sched.doctorId,
        date: sched.date,
      });
    } catch (err) {
      console.error('[UpdateShiftsAndBreaks] save error', err);
      throw err;
    }
    return this.getDaySchedule(doctorId, date);
  }

  private async detectAndNotifyConflicts(
    doctorId: string,
    date: Date,
    shifts: Shift[],
    breaks: Break[],
  ): Promise<void> {
    const bookedAppointments = await this.appointmentsRepo.find({
      where: {
        doctorId,
        appointmentDate: this.formatLocalDate(date) as any,
        status: In([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]) as any,
      },
      relations: ['patient', 'doctor'],
    });

    if (bookedAppointments.length === 0) return;

    const enabledShifts = shifts.filter(s => s.enabled);
    const conflicts: Appointment[] = [];

    for (const apt of bookedAppointments) {
      const aptStart = this.toMinutes(apt.appointmentTime);
      const aptEnd = aptStart + (apt.duration || 30);

      // Check if within any enabled shift
      const inShift = enabledShifts.some(shift => {
        const shiftStart = this.toMinutes(shift.startTime);
        const shiftEnd = this.toMinutes(shift.endTime);
        return aptStart >= shiftStart && aptEnd <= shiftEnd;
      });

      // Check if overlaps with any break
      const inBreak = breaks.some(brk => {
        const brkStart = this.toMinutes(brk.startTime);
        const brkEnd = this.toMinutes(brk.endTime);
        return (aptStart >= brkStart && aptStart < brkEnd) ||
          (aptEnd > brkStart && aptEnd <= brkEnd) ||
          (aptStart <= brkStart && aptEnd >= brkEnd);
      });

      if (!inShift || inBreak) {
        conflicts.push(apt);
      }
    }

    if (conflicts.length > 0) {
      console.log(`[SchedulesService] Found ${conflicts.length} conflicts for doctor ${doctorId} on ${date.toISOString()}`);

      for (const apt of conflicts) {
        const suggestedSlot = await this.findSuggestedSlot(doctorId, date, apt.duration || 30);

        await this.taskRepo.save({
          title: `Reschedule ${apt.patient?.firstName} ${apt.patient?.lastName}`,
          description: `Doctor schedule changed for ${apt.doctor?.lastName}. Appointment at ${apt.appointmentTime} is now outside working hours.${suggestedSlot ? ` Suggested alternative: ${suggestedSlot}` : ' No alternative slots found today.'}`,
          status: 'pending' as any,
          priority: 'high' as any,
          relatedEntityId: apt.id,
          relatedEntityType: 'appointment',
        });
      }

      // Notify all receptionists about the new tasks
      await this.notificationIntegration.createRoleBasedNotification(
        UserRole.RECEPTIONIST,
        'Scheduling Conflicts Detected',
        `${conflicts.length} appointments affected by recent schedule changes. Action required in Tasks.`,
        'high',
      );
    }
  }

  private async findSuggestedSlot(doctorId: string, date: Date, duration: number): Promise<string | null> {
    const daySched = await this.getDaySchedule(doctorId, date);
    const available = daySched.slots.filter(s => s.status === 'available');

    // Simple heuristic: find the first available slot that fits
    for (const slot of available) {
      if (slot.startTime) return slot.startTime;
    }

    return null;
  }

  private validateShiftSequence(shifts: Shift[]): void {
    if (!shifts || shifts.length === 0) return;

    const sorted = [...shifts].sort((a, b) => {
      const timeComp = this.toMinutes(a.startTime) - this.toMinutes(b.startTime);
      if (timeComp !== 0) return timeComp;
      const shiftOrder: Record<string, number> = { morning: 0, afternoon: 1, evening: 2, night: 3, custom: 4 };
      return (shiftOrder[a.type] ?? 9) - (shiftOrder[b.type] ?? 9);
    });

    for (const shift of sorted) {
      const startMin = this.toMinutes(shift.startTime);
      const endMin = this.toMinutes(shift.endTime);
      if (endMin <= startMin) {
        throw new BadRequestException(
          `${shift.type} shift end time must be after start time`,
        );
      }
    }

    // Check consecutive shifts don't overlap
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (!current.enabled || !next.enabled) continue;
      const currentEnd = this.toMinutes(current.endTime);
      const nextStart = this.toMinutes(next.startTime);
      if (currentEnd > nextStart) {
        throw new BadRequestException(
          `${current.type} shift overlaps with ${next.type} shift`,
        );
      }
    }
  }

  private validateBreaks(breaks: Break[], shifts: Shift[]): void {
    if (!breaks || breaks.length === 0) return;

    for (const brk of breaks) {
      const brkStart = this.toMinutes(brk.startTime);
      const brkEnd = this.toMinutes(brk.endTime);
      if (brkEnd <= brkStart) {
        throw new BadRequestException('Break end time must be after start time');
      }
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

    let slot = slots.find((s) => {
      const sStart = this.normalizeRange(s.startTime, s.endTime).startTime;
      const sEnd = this.normalizeRange(s.startTime, s.endTime).endTime;
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
    const dateStr = this.formatLocalDate(date);
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
    const priority: Record<string, number> = { booked: 4, break: 3, blocked: 2, available: 1 };
    const map = new Map<string, Slot>();

    const upsert = (raw: Slot) => {
      const normalized = this.normalizeRange(raw.startTime, raw.endTime);
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
      (a.startTime).localeCompare(b.startTime),
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
        start: this.formatLocalDate(startDate),
        end: this.formatLocalDate(endDate),
      })
      .getMany();

    const blockedDays = docs
      .filter((d) => d.slots.some((s: any) => s.status === 'blocked'))
      .map((d) =>
        d.date instanceof Date
          ? this.formatLocalDate(d.date)
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
    startTime?: string,
    endTime?: string,
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

    const updatePayload: any = {
      workingDays: sortedDays,
    };
    if (startTime) updatePayload.startTime = startTime;
    if (endTime) updatePayload.endTime = endTime;

    await this.settingsService.updateSettings(doctorId, updatePayload);

    return { success: true, days: sortedDays };
  }

  async getWeekSchedule(doctorId: string, startDate: string): Promise<{ date: string; slots: Slot[] }[]> {
    const start = this.normalizeToDate(startDate);
    const weekDays: { date: string; slots: Slot[] }[] = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = this.formatLocalDate(currentDate);
      const daySchedule = await this.getDaySchedule(doctorId, dateStr);
      weekDays.push(daySchedule as any);
    }

    return weekDays;
  }

  async getAvailableDates(doctorId: string, startDate: string, days: number = 30): Promise<string[]> {
    const start = this.normalizeToDate(startDate);
    const availableDates: string[] = [];

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateStr = this.formatLocalDate(currentDate);
      const daySchedule = await this.getDaySchedule(doctorId, dateStr);
      const hasAvailable = daySchedule.slots.some(slot => {
        if (slot.status !== 'available') return false;

        const today = this.normalizeToDate(new Date());
        if (currentDate.getTime() < today.getTime()) return false;

        const slotEnd = slot.endTime || slot.startTime;
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

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const slots: Slot[] = [];
      let currentTime = dto.startTime;

      while (currentTime < dto.endTime) {
        const slotEnd = this.addMinutes(currentTime, slotDuration);

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

      const dateStr = this.formatLocalDate(currentDate);
      await this.bulkSaveSlots(doctorId, currentDate, slots);
      results.push({ date: dateStr, slots });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
  }

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

    const existingSlots = sched.slots || [];
    const bookedSlots = existingSlots.filter((s) => s.status === 'booked');

    const mergedSlots = this.mergeSlots(bookedSlots, slots);
    sched.slots = mergedSlots;

    await this.repo.save(sched);
  }

  async applyTemplateToDateRange(
    doctorId: string,
    dto: ApplyTemplateDto,
  ): Promise<{ date: string; slots: Slot[] }[]> {
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

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      if (template.workingDays.includes(dayOfWeek)) {
        const slots: Slot[] = [];
        let currentTime = template.startTime;

        while (currentTime < template.endTime) {
          const slotEnd = this.addMinutes(
            currentTime,
            template.slotDuration || 30,
          );

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

        const dateStr = this.formatLocalDate(currentDate);
        await this.bulkSaveSlots(doctorId, currentDate, slots);
        results.push({ date: dateStr, slots });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
  }

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

    for (const slot of slots) {
      const slotStart = slot.startTime;
      const slotEnd = slot.endTime;

      const overlaps =
        (slotStart >= safeStart && slotStart < safeEnd) ||
        (slotEnd > safeStart && slotEnd <= safeEnd) ||
        (slotStart <= safeStart && slotEnd >= safeEnd);

      if (overlaps) {
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

    if (updatedCount === 0 && dto.status !== 'booked') {
      let currentTime = safeStart;
      const slotDuration = 30;

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
      const dateStr = this.formatLocalDate(currentDate);
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

