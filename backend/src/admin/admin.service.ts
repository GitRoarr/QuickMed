import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { CreateAppointmentDto } from '../appointments/dto/create-appointment.dto';
import { UpdateAppointmentDto } from '../appointments/dto/update-appointment.dto';

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
  todayAppointments: number;
  thisWeekAppointments: number;
  thisMonthAppointments: number;
  revenue: number;
  averageAppointmentDuration: number;
  patientSatisfactionScore: number;
}

export interface AdminDashboardData {
  stats: AdminStats;
  recentAppointments: Appointment[];
  recentUsers: User[];
  upcomingAppointments: Appointment[];
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    api: 'healthy' | 'warning' | 'error';
    storage: 'healthy' | 'warning' | 'error';
    notifications: 'healthy' | 'warning' | 'error';
  };
  notifications: any[];
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
  ) {}

  async getDashboardData(): Promise<AdminDashboardData> {
    const stats = await this.getAdminStats();
    const recentAppointments = await this.getRecentAppointments();
    const recentUsers = await this.getRecentUsers();
    const upcomingAppointments = await this.getUpcomingAppointments();
    const systemHealth = await this.getSystemHealth();
    const notifications = await this.getSystemNotifications();

    return {
      stats,
      recentAppointments,
      recentUsers,
      upcomingAppointments,
      systemHealth,
      notifications,
    };
  }

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
      todayAppointments,
      thisWeekAppointments,
      thisMonthAppointments,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { role: 'patient' } }),
      this.userRepository.count({ where: { role: 'doctor' } }),
      this.userRepository.count({ where: { role: 'admin' } }),
      this.appointmentRepository.count(),
      this.appointmentRepository.count({ where: { status: 'pending' } }),
      this.appointmentRepository.count({ where: { status: 'confirmed' } }),
      this.appointmentRepository.count({ where: { status: 'completed' } }),
      this.appointmentRepository.count({ where: { status: 'cancelled' } }),
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
      todayAppointments,
      thisWeekAppointments,
      thisMonthAppointments,
      revenue: await this.calculateRevenue(),
      averageAppointmentDuration: await this.getAverageAppointmentDuration(),
      patientSatisfactionScore: await this.getPatientSatisfactionScore(),
    };
  }

  async getAllUsers(page: number = 1, limit: number = 10, role?: string) {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    
    if (role) {
      queryBuilder.where('user.role = :role', { role });
    }

    const [users, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['appointments', 'appointments.doctor', 'appointments.patient'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(id);
    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    await this.userRepository.remove(user);
  }

  async getAllAppointments(page: number = 1, limit: number = 10, status?: string) {
    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('appointment.doctor', 'doctor');

    if (status) {
      queryBuilder.where('appointment.status = :status', { status });
    }

    const [appointments, total] = await queryBuilder
      .orderBy('appointment.appointmentDate', 'DESC')
      .addOrderBy('appointment.appointmentTime', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      appointments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAppointmentById(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['patient', 'doctor'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async createAppointment(createAppointmentDto: CreateAppointmentDto): Promise<Appointment> {
    const appointment = this.appointmentRepository.create(createAppointmentDto);
    return await this.appointmentRepository.save(appointment);
  }

  async updateAppointment(id: string, updateAppointmentDto: UpdateAppointmentDto): Promise<Appointment> {
    const appointment = await this.getAppointmentById(id);
    Object.assign(appointment, updateAppointmentDto);
    return await this.appointmentRepository.save(appointment);
  }

  async deleteAppointment(id: string): Promise<void> {
    const appointment = await this.getAppointmentById(id);
    await this.appointmentRepository.remove(appointment);
  }

  async getSystemHealth() {
    try {
      // Check database connection
      await this.userRepository.count();
      const database = 'healthy';

      // Check API response time
      const apiStart = Date.now();
      await this.appointmentRepository.count();
      const apiResponseTime = Date.now() - apiStart;
      const api = apiResponseTime < 1000 ? 'healthy' : 'warning';

      // Check storage (simplified)
      const storage = 'healthy';

      // Check notifications (simplified)
      const notifications = 'healthy';

      return { database, api, storage, notifications };
    } catch (error) {
      return {
        database: 'error',
        api: 'error',
        storage: 'error',
        notifications: 'error',
      };
    }
  }

  async getSystemNotifications() {
    // Simulate system notifications
    return [
      {
        id: 1,
        type: 'info',
        title: 'System Update Available',
        message: 'A new system update is available. Please schedule maintenance.',
        timestamp: new Date(),
        read: false,
      },
      {
        id: 2,
        type: 'warning',
        title: 'High Server Load',
        message: 'Server load is above 80%. Consider scaling resources.',
        timestamp: new Date(Date.now() - 3600000),
        read: false,
      },
      {
        id: 3,
        type: 'success',
        title: 'Backup Completed',
        message: 'Daily backup completed successfully.',
        timestamp: new Date(Date.now() - 7200000),
        read: true,
      },
    ];
  }

  private async getRecentAppointments(): Promise<Appointment[]> {
    return await this.appointmentRepository.find({
      relations: ['patient', 'doctor'],
      order: { createdAt: 'DESC' },
      take: 5,
    });
  }

  private async getRecentUsers(): Promise<User[]> {
    return await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });
  }

  private async getUpcomingAppointments(): Promise<Appointment[]> {
    const today = new Date();
    return await this.appointmentRepository.find({
      where: {
        appointmentDate: new Date(today.toISOString().split('T')[0]),
        status: 'confirmed',
      },
      relations: ['patient', 'doctor'],
      order: { appointmentTime: 'ASC' },
      take: 10,
    });
  }

  private async getTodayAppointmentsCount(): Promise<number> {
    const today = new Date();
    return await this.appointmentRepository.count({
      where: {
        appointmentDate: new Date(today.toISOString().split('T')[0]),
      },
    });
  }

  private async getThisWeekAppointmentsCount(): Promise<number> {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    return await this.appointmentRepository.count({
      where: {
        appointmentDate: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        } as any,
      },
    });
  }

  private async getThisMonthAppointmentsCount(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);

    return await this.appointmentRepository.count({
      where: {
        appointmentDate: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        } as any,
      },
    });
  }

  private async calculateRevenue(): Promise<number> {
    // Simplified revenue calculation
    const completedAppointments = await this.appointmentRepository.count({
      where: { status: 'completed' },
    });
    return completedAppointments * 150; // $150 per appointment
  }

  private async getAverageAppointmentDuration(): Promise<number> {
    // Simplified - return 30 minutes average
    return 30;
  }

  private async getPatientSatisfactionScore(): Promise<number> {
    // Simplified - return 4.5/5 average
    return 4.5;
  }

  async exportUserData(userId: string): Promise<any> {
    const user = await this.getUserById(userId);
    const appointments = await this.appointmentRepository.find({
      where: [
        { patient: { id: userId } },
        { doctor: { id: userId } },
      ],
      relations: ['patient', 'doctor'],
    });

    return {
      user,
      appointments,
      exportDate: new Date(),
    };
  }

  async generateReport(type: 'users' | 'appointments' | 'revenue', startDate?: Date, endDate?: Date): Promise<any> {
    const reportData = {
      type,
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: endDate || new Date(),
      generatedAt: new Date(),
    };

    switch (type) {
      case 'users':
        reportData['userStats'] = await this.getAdminStats();
        break;
      case 'appointments':
        reportData['appointmentStats'] = await this.getAdminStats();
        break;
      case 'revenue':
        reportData['revenueStats'] = {
          totalRevenue: await this.calculateRevenue(),
          averageRevenue: await this.calculateRevenue() / 30,
        };
        break;
    }

    return reportData;
  }
}

