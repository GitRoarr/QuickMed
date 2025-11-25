import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { CreateAppointmentDto } from '../appointments/dto/create-appointment.dto';
import { UpdateAppointmentDto } from '../appointments/dto/update-appointment.dto';
import { UserRole, AppointmentStatus } from '../common/index';
import { AdminStatsService, AdminStats } from './admin.stats.service';
import { DoctorsService } from '../doctors/doctors.service';

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
    private readonly statsService: AdminStatsService,
    private readonly doctorsService: DoctorsService
  ) {}

  // -------------------- Dashboard --------------------
  async getDashboardData(): Promise<AdminDashboardData> {
    const stats = await this.statsService.getAdminStats();
    const recentAppointments = await this.getRecentAppointments();
    const recentUsers = await this.getRecentUsers();
    const upcomingAppointments = await this.getUpcomingAppointments();
    const systemHealth = await this.getSystemHealth();
    const notifications = await this.getSystemNotifications();

    return { stats, recentAppointments, recentUsers, upcomingAppointments, systemHealth, notifications };
    
  }

  async getAdminStats(): Promise<AdminStats> {
    return this.statsService.getAdminStats();
  }

  async exportUserData(userId: string) {
    const user = await this.getUserById(userId);
    const appointments = await this.appointmentRepository.find({
      where: [{ patientId: userId }, { doctorId: userId }],
      relations: ['patient', 'doctor'],
    });
    return { user, appointments, exportDate: new Date() };
  }

  async generateReport(
    type: 'users' | 'appointments' | 'revenue',
    startDate?: Date,
    endDate?: Date
  ) {
    const reportData: any = {
      type,
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // default last 30 days
      endDate: endDate || new Date(),
      generatedAt: new Date(),
    };

    const stats = await this.statsService.getAdminStats();

    switch (type) {
      case 'users':
        reportData['userStats'] = stats;
        break;
      case 'appointments':
        reportData['appointmentStats'] = stats;
        break;
      case 'revenue':
        reportData['revenueStats'] = {
          totalRevenue: stats.revenue,
          averageRevenue: stats.revenue / 30,
        };
        break;
    }
    return reportData;
  }

  // -------------------- Users --------------------
  async getAllUsers(page = 1, limit = 10, role?: string, search?: string) {
    const query = this.userRepository.createQueryBuilder('user');
    if (role) query.andWhere('user.role = :role', { role });

    if (search) {
      const likeTerm = `%${search.toLowerCase()}%`;
      query.andWhere(
        '(LOWER(user.firstName) LIKE :likeTerm OR LOWER(user.lastName) LIKE :likeTerm OR LOWER(user.email) LIKE :likeTerm OR LOWER(user.patientId) LIKE :likeTerm)',
        { likeTerm },
      );
    }
    const [users, total] = await query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['patientAppointments', 'doctorAppointments', 'patientAppointments.patient', 'doctorAppointments.doctor'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(dto: CreateUserDto) {
    const user = this.userRepository.create(dto);
    return this.userRepository.save(user);
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.getUserById(id);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async deleteUser(id: string) {
    const user = await this.getUserById(id);
    await this.userRepository.remove(user);
  }

  // -------------------- Appointments --------------------
  async getAllAppointments(page = 1, limit = 10, status?: string) {
    const query = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('appointment.doctor', 'doctor');
    if (status) query.where('appointment.status = :status', { status });
    const [appointments, total] = await query
      .orderBy('appointment.appointmentDate', 'DESC')
      .addOrderBy('appointment.appointmentTime', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { appointments, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAppointmentById(id: string) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['patient', 'doctor'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async createAppointment(dto: CreateAppointmentDto) {
    const doctor = await this.userRepository.findOne({ where: { id: dto.doctorId } });
    if (!doctor || doctor.role !== UserRole.DOCTOR) throw new BadRequestException('Invalid doctor ID');
    const appointment = this.appointmentRepository.create({ ...dto, patientId: 'placeholder_patient_id' });
    return this.appointmentRepository.save(appointment);
  }

  async updateAppointment(id: string, dto: UpdateAppointmentDto) {
    const appointment = await this.getAppointmentById(id);
    Object.assign(appointment, dto);
    return this.appointmentRepository.save(appointment);
  }

  async deleteAppointment(id: string) {
    const appointment = await this.getAppointmentById(id);
    await this.appointmentRepository.remove(appointment);
  }
async getSystemHealth(): Promise<{
  database: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  notifications: 'healthy' | 'warning' | 'error';
}> {
  try {
    await this.userRepository.count();
    const database: 'healthy' | 'warning' | 'error' = 'healthy';

    const apiStart = Date.now();
    await this.appointmentRepository.count();
    const apiResponseTime = Date.now() - apiStart;
    const api: 'healthy' | 'warning' | 'error' = apiResponseTime < 1000 ? 'healthy' : 'warning';

    const storage: 'healthy' | 'warning' | 'error' = 'healthy';
    const notifications: 'healthy' | 'warning' | 'error' = 'healthy';

    return { database, api, storage, notifications };
  } catch (error) {
    return {
      database: 'error' as 'error',
      api: 'error' as 'error',
      storage: 'error' as 'error',
      notifications: 'error' as 'error',
    };
  }
}


  async getSystemNotifications() {
    return [
      { id: 1, type: 'info', title: 'Update Available', message: 'New update available.', timestamp: new Date(), read: false },
      { id: 2, type: 'warning', title: 'High Load', message: 'Server load >80%.', timestamp: new Date(), read: false },
      { id: 3, type: 'success', title: 'Backup Done', message: 'Backup completed.', timestamp: new Date(), read: true },
    ];
  }

  private async getRecentAppointments() {
    return this.appointmentRepository.find({ relations: ['patient', 'doctor'], order: { createdAt: 'DESC' }, take: 5 });
  }

  private async getRecentUsers() {
    return this.userRepository.find({ order: { createdAt: 'DESC' }, take: 5 });
  }

  private async getUpcomingAppointments() {
    const today = new Date();
    return this.appointmentRepository.find({
      where: { appointmentDate: today, status: AppointmentStatus.CONFIRMED },
      relations: ['patient', 'doctor'],
      order: { appointmentTime: 'ASC' },
      take: 10,
    });
  }

  async addDoctor(dto: any) {
    return this.doctorsService.createDoctorInvite(dto);
  }

  async activateDoctor(id: string) {
    return this.doctorsService.activateDoctor(id);
  }

  async validateDoctor(id: string) {
    return this.doctorsService.validateLicense(id);
  }

  async confirmDoctorEmployment(id: string) {
    return this.doctorsService.confirmEmployment(id);
  }

  async getAllDoctors() {
    return this.doctorsService.findAll();
  }
}
