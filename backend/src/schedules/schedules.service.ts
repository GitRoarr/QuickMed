import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DoctorSchedule, Slot } from './schedule.entity';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(DoctorSchedule)
    private readonly repo: Repository<DoctorSchedule>,
  ) {}

  private defaultTimes(): string[] {
    return ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
  }

  private buildDefaultSlots(): Slot[] {
    return this.defaultTimes().map(t => ({ time: t, status: 'available' as const, appointmentId: null, blockedReason: null }));
  }

  private normalizeToDate(date: string | Date): Date {
    if (date instanceof Date) return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  async getDaySchedule(doctorId: string, date: string | Date) {
    const dateObj = this.normalizeToDate(date);

    let sched = await this.repo.findOne({ where: { doctorId, date: dateObj } });
    if (!sched) {
      const slots = this.buildDefaultSlots();
      sched = this.repo.create({ doctorId, date: dateObj, slots });
      await this.repo.save(sched);
    }

    const dateStr = sched.date instanceof Date ? sched.date.toISOString().split('T')[0] : String(sched.date);
    return { date: dateStr, slots: sched.slots };
  }

  async setSlotStatus(doctorId: string, date: string | Date, time: string, status: 'available'|'blocked'|'booked', reason?: string) {
    const dateObj = this.normalizeToDate(date);

    let sched = await this.repo.findOne({ where: { doctorId, date: dateObj } });
    if (!sched) {
      sched = this.repo.create({ doctorId, date: dateObj, slots: this.buildDefaultSlots() });
    }

    const slots = sched.slots || [];
    let slot = slots.find(s => s.time === time);
    if (!slot) {
      slot = { time, status, appointmentId: null, blockedReason: status === 'blocked' ? (reason ?? null) : null };
      slots.push(slot);
    } else {
      slot.status = status;
      slot.blockedReason = status === 'blocked' ? (reason ?? null) : null;
      if (status !== 'booked') slot.appointmentId = null;
    }
    sched.slots = slots;
    await this.repo.save(sched);
    return { success: true, slot };
  }

  async getMonthlyOverview(doctorId: string, year: number, month: number) {
    const mm = String(month).padStart(2,'0');
    const start = `${year}-${mm}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${mm}-${String(lastDay).padStart(2,'0')}`;

    // convert start/end to Date objects
    const startDate = this.normalizeToDate(start);
    const endDate = this.normalizeToDate(end);

    const docs = await this.repo.createQueryBuilder('s')
      .where('s.doctorId = :doctorId', { doctorId })
      .andWhere('s.date BETWEEN :start AND :end', { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] })
      .getMany();

    const blockedDays = docs.filter(d => d.slots.some((s:any)=> s.status === 'blocked')).map(d => {
      const ds = d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date);
      return ds;
    });

    return { blockedDays, count: docs.length };
  }

  async getBlockedDays(doctorId: string, year: number, month: number) {
    const overview = await this.getMonthlyOverview(doctorId, year, month);
    return overview.blockedDays;
  }
}