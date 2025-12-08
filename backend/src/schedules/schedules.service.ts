import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DoctorSchedule, Slot } from './schedule.entity';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(DoctorSchedule)
    private readonly repo: Repository<DoctorSchedule>,
  ) {}

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

    if (!sched) {
      return { date: dateObj.toISOString().split('T')[0], slots: [] };
    }

    const dateStr =
      sched.date instanceof Date
        ? sched.date.toISOString().split('T')[0]
        : String(sched.date);

    return { date: dateStr, slots: sched.slots };
  }
  async setSingleSlotStatus(
    doctorId: string,
    date: string | Date,
    time: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
  ) {
    return this.saveSlot(doctorId, date, time, time, status, reason);
  }

  async setRangeSlotStatus(
    doctorId: string,
    date: string | Date,
    startTime: string,
    endTime: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
  ) {
    return this.saveSlot(
      doctorId,
      date,
      startTime,
      endTime,
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
      return this.saveSlot(doctorId, date, time, time, status, reason);
    }

    const startTime = arg3;
    const endTime = String(arg4);
    const status = (arg5 as 'available' | 'blocked' | 'booked') ?? 'available';
    const reason = arg6;
    return this.saveSlot(doctorId, date, startTime, endTime, status, reason);
  }


  private async saveSlot(
    doctorId: string,
    date: string | Date,
    startTime: string,
    endTime: string,
    status: 'available' | 'blocked' | 'booked',
    reason?: string,
  ): Promise<{ success: boolean; slot: Slot }> {
    const dateObj = this.normalizeToDate(date);

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
      (s) => s.startTime === startTime && s.endTime === endTime,
    );

    if (!slot) {
      slot = {
        startTime,
        endTime,
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
}
