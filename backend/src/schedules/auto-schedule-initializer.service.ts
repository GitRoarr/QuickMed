import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not, IsNull } from 'typeorm';
import { DoctorSchedule, Shift } from './schedule.entity';
import { DoctorSettings } from '../settings/entities/doctor-settings.entity';

@Injectable()
export class AutoScheduleInitializerService {
    constructor(
        @InjectRepository(DoctorSchedule)
        private readonly scheduleRepo: Repository<DoctorSchedule>,
        @InjectRepository(DoctorSettings)
        private readonly settingsRepo: Repository<DoctorSettings>,
    ) {}

    private readonly defaultShifts: Shift[] = [
        {
            type: 'morning',
            startTime: '08:00',
            endTime: '12:00',
            slotDuration: 30,
            enabled: true,
        },
        {
            type: 'afternoon',
            startTime: '12:00',
            endTime: '17:00',
            slotDuration: 30,
            enabled: true,
        },
        {
            type: 'evening',
            startTime: '17:00',
            endTime: '20:00',
            slotDuration: 30,
            enabled: true,
        },
    ];

    async autoInitializeScheduleIfNeeded(
        doctorId: string,
        date: string | Date,
    ): Promise<boolean> {
        const dateObj = this.normalizeToDate(date);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayName = dayNames[dateObj.getDay()];

        const existingSchedule = await this.scheduleRepo.findOne({
            where: { doctorId, date: dateObj },
        });

        if (existingSchedule) {
            return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj < today) {
            return false;
        }

        // Try to get settings first
        const settings = await this.settingsRepo.findOne({
            where: { doctorId },
        });

        // Check if day is a working day via settings
        let isWorkingDay = false;
        if (settings?.availableDays?.length) {
            const normalizedAvailableDays = settings.availableDays.map((d) => String(d).toLowerCase());
            isWorkingDay = normalizedAvailableDays.includes(currentDayName.toLowerCase());
        }

        // Determine shifts to use (from settings, existing schedule template, or defaults)
        let shiftsToUse: Shift[] = this.defaultShifts;

        // Strategy 1: If settings has availableDays and this is not a working day, skip
        if (settings?.availableDays?.length && !isWorkingDay) {
            return false;
        }

        // Strategy 2: Try to find an existing schedule with shifts for the same day of week
        // This allows doctors who manually set up schedules to have them reused
        const recentScheduleWithShifts = await this.findTemplateSchedule(doctorId, currentDayName);
        
        if (recentScheduleWithShifts?.shifts?.length) {
            // Use the existing schedule's shifts as template
            shiftsToUse = recentScheduleWithShifts.shifts.map(s => ({ ...s }));
            isWorkingDay = true; // Doctor has worked on this day before
        }

        // If no settings configured AND no existing schedule template found, use defaults
        // This ensures doctors with no explicit configuration can still accept appointments
        if (!settings?.availableDays?.length && !recentScheduleWithShifts) {
            // Check if doctor has ANY schedules with shifts - if so, they've set up manually
            const anyScheduleWithShifts = await this.scheduleRepo.findOne({
                where: { doctorId },
                order: { date: 'DESC' },
            });
            
            if (anyScheduleWithShifts?.shifts?.length) {
                shiftsToUse = anyScheduleWithShifts.shifts.map(s => ({ ...s }));
                isWorkingDay = true;
            } else {
                // No schedules exist and no settings - assume available on weekdays
                const weekdayIndex = dateObj.getDay();
                isWorkingDay = weekdayIndex >= 1 && weekdayIndex <= 5; // Mon-Fri
            }
        }

        if (!isWorkingDay) {
            return false;
        }

        const newSchedule = this.scheduleRepo.create({
            doctorId,
            date: dateObj,
            shifts: shiftsToUse,
            breaks: [],
            slots: [],
        });

        await this.scheduleRepo.save(newSchedule);
        return true;
    }

    /**
     * Find a schedule for the same day of week that can serve as a template
     */
    private async findTemplateSchedule(
        doctorId: string,
        dayName: string,
    ): Promise<DoctorSchedule | null> {
        // Get recent schedules for this doctor
        const recentSchedules = await this.scheduleRepo.find({
            where: { doctorId },
            order: { date: 'DESC' },
            take: 14, // Look at last 2 weeks
        });

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Find a schedule from the same day of week with shifts defined
        for (const sched of recentSchedules) {
            const schedDate = sched.date instanceof Date ? sched.date : new Date(sched.date);
            const schedDayName = dayNames[schedDate.getDay()];
            if (schedDayName === dayName && sched.shifts?.length) {
                return sched;
            }
        }

        return null;
    }

    private normalizeToDate(date: string | Date): Date {
        const d = date instanceof Date ? date : new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
}
