import { Injectable, BadRequestException } from '@nestjs/common';
import { getAvailableSlotsForDate } from './doctor-schedule.utils';

@Injectable()
export class DoctorScheduleService {

  /**
   * Core slot generator
   */
  getSlots(
    date: Date,
    startTime: string,
    endTime: string,
    slotDuration: number,
    gracePeriod = 0
  ) {
    return getAvailableSlotsForDate(
      date,
      startTime,
      endTime,
      slotDuration,
      gracePeriod
    );
  }

  /**
   * Production-safe wrapper with validation
   */
  getSlotsSafe(
    date: Date,
    startTime: string,
    endTime: string,
    slotDuration: number,
    gracePeriod = 0
  ) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    if (!this.isValidTime(startTime) || !this.isValidTime(endTime)) {
      throw new BadRequestException('startTime and endTime must be HH:mm');
    }

    if (slotDuration <= 0 || slotDuration > 1440) {
      throw new BadRequestException('Invalid slot duration');
    }

    if (gracePeriod < 0 || gracePeriod > 60) {
      throw new BadRequestException('Invalid grace period');
    }

    return this.getSlots(date, startTime, endTime, slotDuration, gracePeriod);
  }

  private isValidTime(time: string): boolean {
    return /^\d{2}:\d{2}$/.test(time);
  }
}
