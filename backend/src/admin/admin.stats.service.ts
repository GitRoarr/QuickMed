import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { UserRole, AppointmentStatus, PaymentStatus } from '../common/index';
import { ConsultationsService } from '../consultations/consultations.service';
import { Payment } from '../payments/entities/payment.entity';

export interface AdminStats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalAdmins: number;
  totalAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  missedAppointments: number;
  overdueAppointments: number;
  todayAppointments: number;
  thisWeekAppointments: number;
  thisMonthAppointments: number;
  revenue: number;
  averageAppointmentDuration: number;
  patientSatisfactionScore: number;
}

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private readonly consultationsService: ConsultationsService,
  ) { }

  async getAdminStats(): Promise<AdminStats> {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      totalAdmins,
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      missedAppointments,
      overdueAppointments,
      todayAppointments,
      thisWeekAppointments,
      thisMonthAppointments,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { role: UserRole.PATIENT } }),
      this.userRepository.count({ where: { role: UserRole.DOCTOR } }),
      this.userRepository.count({ where: { role: UserRole.ADMIN } }),
      this.appointmentRepository.count(),
      this.appointmentRepository.count({ where: { status: AppointmentStatus.PENDING } }),
      this.appointmentRepository.count({ where: { status: AppointmentStatus.CONFIRMED } }),
      this.appointmentRepository.count({ where: { status: AppointmentStatus.COMPLETED } }),
      this.appointmentRepository.count({ where: { status: AppointmentStatus.CANCELLED } }),
      this.appointmentRepository.count({ where: { status: AppointmentStatus.MISSED } }),
      this.appointmentRepository.count({ where: { status: AppointmentStatus.OVERDUE } }),
      this.getTodayAppointmentsCount(),
      this.getThisWeekAppointmentsCount(),
      this.getThisMonthAppointmentsCount(),
    ]);

    return {
      totalUsers,
      totalPatients,
      totalDoctors,
      totalAdmins,
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      missedAppointments,
      overdueAppointments,
      todayAppointments,
      thisWeekAppointments,
      thisMonthAppointments,
      revenue: await this.calculateRevenue(),
      averageAppointmentDuration: await this.getAverageAppointmentDuration(),
      patientSatisfactionScore: await this.getPatientSatisfactionScore(),
    };
  }

  private async getTodayAppointmentsCount(): Promise<number> {
    const today = new Date();
    return this.appointmentRepository.count({
      where: { appointmentDate: new Date(today.toISOString().split('T')[0]) },
    });
  }

  private async getThisWeekAppointmentsCount(): Promise<number> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return this.appointmentRepository.count({
      where: { appointmentDate: Between(startOfWeek, endOfWeek) },
    });
  }

  private async getThisMonthAppointmentsCount(): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.appointmentRepository.count({
      where: { appointmentDate: Between(startOfMonth, endOfMonth) },
    });
  }

  private async calculateRevenue(): Promise<number> {
    const revenueRaw = await this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.PAID })
      .select('SUM(payment.amount)', 'sum')
      .getRawOne();
    return Number(revenueRaw?.sum || 0);
  }

  private async getAverageAppointmentDuration(): Promise<number> {
    const stats = await this.consultationsService.stats();
    return stats.averageConsultationMinutes;
  }

  private async getPatientSatisfactionScore(): Promise<number> {
    const stats = await this.consultationsService.stats();
    return stats.satisfactionRate;
  }
}
