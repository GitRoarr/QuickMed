import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorSchedule } from './schedule.entity';
import { DoctorSettings } from '../settings/entities/doctor-settings.entity';

@Injectable()
export class AutoScheduleInitializerService {
    constructor(
        @InjectRepository(DoctorSchedule)
        private readonly scheduleRepo: Repository<DoctorSchedule>,
        @InjectRepository(DoctorSettings)
        private readonly settingsRepo: Repository<DoctorSettings>,
    ) {}

    async autoInitializeScheduleIfNeeded(
        doctorId: string,
        date: string | Date,
    ): Promise<boolean> {
        const dateObj = this.normalizeToDate(date);

        const existingSchedule = await this.scheduleRepo.findOne({
            where: { doctorId, date: dateObj },
        });

        if (existingSchedule) {
            return false;
        }

        const settings = await this.settingsRepo.findOne({
            where: { doctorId },
        });

        if (!settings || !settings.availableDays?.length) {
            return false;
        }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayName = dayNames[dateObj.getDay()];
        const normalizedAvailableDays = (settings.availableDays || []).map((d) => String(d).toLowerCase());
        const isWorkingDay = normalizedAvailableDays.includes(String(currentDayName).toLowerCase());

        if (!isWorkingDay) {
            return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj < today) {
            return false;
        }

        const newSchedule = this.scheduleRepo.create({
            doctorId,
            date: dateObj,
            shifts: [],
            breaks: [],
            slots: [],
        });

        await this.scheduleRepo.save(newSchedule);
        return true;
    }

    private normalizeToDate(date: string | Date): Date {
        const d = date instanceof Date ? date : new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
}
