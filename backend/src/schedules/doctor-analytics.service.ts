import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { DoctorAnalytics } from './entities/doctor-analytics.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentStatus } from '../common/index';

export interface DailyStats {
    date: string;
    totalPatients: number;
    completedAppointments: number;
    missedAppointments: number;
    pendingAppointments: number;
    averageConsultationMinutes: number;
    videoConsultations: number;
    inPersonConsultations: number;
}

export interface WeeklySummary {
    weekStart: string;
    weekEnd: string;
    totalPatients: number;
    completedAppointments: number;
    missedAppointments: number;
    averageConsultationMinutes: number;
    dailyBreakdown: DailyStats[];
}

@Injectable()
export class DoctorAnalyticsService {
    constructor(
        @InjectRepository(DoctorAnalytics)
        private readonly analyticsRepo: Repository<DoctorAnalytics>,
        @InjectRepository(Appointment)
        private readonly appointmentRepo: Repository<Appointment>,
    ) { }

    private normalizeDate(date: string | Date): Date {
        if (date instanceof Date) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        }
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    async updateDailyStats(doctorId: string, date: string | Date): Promise<DoctorAnalytics> {
        const dateObj = this.normalizeDate(date);
        const dateStr = dateObj.toISOString().split('T')[0];

        // Get all appointments for this doctor on this date
        const appointments = await this.appointmentRepo.find({
            where: {
                doctorId,
                appointmentDate: dateStr as any,
            },
        });

        const completed = appointments.filter(
            (a) => a.status === AppointmentStatus.COMPLETED,
        );
        const missed = appointments.filter(
            (a) => a.status === AppointmentStatus.CANCELLED,
        );
        const pending = appointments.filter(
            (a) => a.status === AppointmentStatus.PENDING,
        );

        const totalConsultationMinutes = completed.reduce(
            (sum, a) => sum + (a.duration || 30),
            0,
        );
        const averageConsultationMinutes =
            completed.length > 0 ? totalConsultationMinutes / completed.length : 0;

        const videoConsultations = completed.filter((a) => a.isVideoConsultation).length;
        const inPersonConsultations = completed.filter((a) => !a.isVideoConsultation).length;

        // Calculate appointment type breakdown
        const typeBreakdown = new Map<string, number>();
        completed.forEach((a) => {
            const type = a.appointmentType || 'Consultation';
            typeBreakdown.set(type, (typeBreakdown.get(type) || 0) + 1);
        });

        const appointmentTypeBreakdown = Array.from(typeBreakdown.entries()).map(
            ([type, count]) => ({ type, count }),
        );

        // Find or create analytics record
        let analytics = await this.analyticsRepo.findOne({
            where: { doctorId, date: dateObj },
        });

        if (!analytics) {
            analytics = this.analyticsRepo.create({ doctorId, date: dateObj });
        }

        // Update stats
        analytics.totalPatients = completed.length;
        analytics.completedAppointments = completed.length;
        analytics.missedAppointments = missed.length;
        analytics.pendingAppointments = pending.length;
        analytics.totalConsultationMinutes = totalConsultationMinutes;
        analytics.averageConsultationMinutes = Number(averageConsultationMinutes.toFixed(2));
        analytics.videoConsultations = videoConsultations;
        analytics.inPersonConsultations = inPersonConsultations;
        analytics.appointmentTypeBreakdown = appointmentTypeBreakdown;

        return this.analyticsRepo.save(analytics);
    }

    async getTodayStats(doctorId: string): Promise<DailyStats> {
        const today = this.normalizeDate(new Date());
        await this.updateDailyStats(doctorId, today);

        const analytics = await this.analyticsRepo.findOne({
            where: { doctorId, date: today },
        });

        if (!analytics) {
            return {
                date: today.toISOString().split('T')[0],
                totalPatients: 0,
                completedAppointments: 0,
                missedAppointments: 0,
                pendingAppointments: 0,
                averageConsultationMinutes: 0,
                videoConsultations: 0,
                inPersonConsultations: 0,
            };
        }

        return this.mapToStats(analytics);
    }

    async getWeekStats(doctorId: string, startDate?: string | Date): Promise<WeeklySummary> {
        const start = startDate ? this.normalizeDate(startDate) : this.getWeekStart(new Date());
        const weekDays: Date[] = [];

        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            weekDays.push(day);
            await this.updateDailyStats(doctorId, day);
        }

        const weekEnd = new Date(start);
        weekEnd.setDate(start.getDate() + 6);

        const analytics = await this.analyticsRepo.find({
            where: {
                doctorId,
                date: Between(start, weekEnd) as any,
            },
            order: { date: 'ASC' },
        });

        const dailyBreakdown = analytics.map((a) => this.mapToStats(a));

        const totalPatients = analytics.reduce((sum, a) => sum + a.totalPatients, 0);
        const completedAppointments = analytics.reduce(
            (sum, a) => sum + a.completedAppointments,
            0,
        );
        const missedAppointments = analytics.reduce(
            (sum, a) => sum + a.missedAppointments,
            0,
        );
        const avgConsultationMinutes =
            completedAppointments > 0
                ? analytics.reduce((sum, a) => sum + a.totalConsultationMinutes, 0) /
                completedAppointments
                : 0;

        return {
            weekStart: start.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            totalPatients,
            completedAppointments,
            missedAppointments,
            averageConsultationMinutes: Number(avgConsultationMinutes.toFixed(2)),
            dailyBreakdown,
        };
    }

    async getMonthStats(
        doctorId: string,
        year: number,
        month: number,
    ): Promise<DoctorAnalytics[]> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        return this.analyticsRepo.find({
            where: {
                doctorId,
                date: Between(startDate, endDate) as any,
            },
            order: { date: 'ASC' },
        });
    }

    private mapToStats(analytics: DoctorAnalytics): DailyStats {
        return {
            date: analytics.date instanceof Date
                ? analytics.date.toISOString().split('T')[0]
                : String(analytics.date),
            totalPatients: analytics.totalPatients,
            completedAppointments: analytics.completedAppointments,
            missedAppointments: analytics.missedAppointments,
            pendingAppointments: analytics.pendingAppointments,
            averageConsultationMinutes: Number(analytics.averageConsultationMinutes),
            videoConsultations: analytics.videoConsultations,
            inPersonConsultations: analytics.inPersonConsultations,
        };
    }

    private getWeekStart(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }
}
