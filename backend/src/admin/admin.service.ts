import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../common/services/email.service';
import { SmsService } from '../common/services/sms.service';
import { Appointment } from '../appointments/entities/appointment.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { CreateAppointmentDto } from '../appointments/dto/create-appointment.dto';
import { UpdateAppointmentDto } from '../appointments/dto/update-appointment.dto';
import { UserRole, AppointmentStatus, AppointmentType } from '../common/index';
import { AdminStatsService, AdminStats } from './admin.stats.service';
import { DoctorsService } from '../doctors/doctors.service';
import { ReviewsService } from '../reviews/reviews.service';

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
    ,
    private readonly emailService?: EmailService,
    private readonly smsService?: SmsService,
    private readonly reviewsService?: ReviewsService,
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
    // prevent duplicate emails
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    // ensure role defaults to PATIENT when not provided
    if (!dto.role) dto.role = UserRole.PATIENT;

    const user = this.userRepository.create({
      ...dto,
    });

    // If admin provided a password, hash it
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
      user.mustChangePassword = false;
    } else {
      // No password provided by admin
      if (user.role === UserRole.PATIENT) {
        // For patients: generate a temporary password, hash it, and force password change on first login
        const tempPassword = this.generateTempPassword();
        user.password = await bcrypt.hash(tempPassword, 10);
        user.mustChangePassword = true;

        // Save user first to get id
        const saved = await this.userRepository.save(user);

        // Send email with temporary password
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
          const loginLink = `${frontendUrl}/auth/login`;
          const subject = 'Your QuickMed account — temporary password';
          const html = `
            <h3>Welcome to QuickMed</h3>
            <p>An account has been created for you. Use the temporary password below to sign in, then change your password immediately.</p>
            <p><strong>Temporary password:</strong> <code>${tempPassword}</code></p>
            <p><a href="${loginLink}">Sign in to QuickMed</a></p>
            <p>If you did not expect this, please contact support.</p>
          `;
          if (this.emailService) {
            await this.emailService.sendMail(saved.email, subject, html);
          } else {
            console.log('[AdminService] EmailService not available; temp password:', tempPassword);
          }
        } catch (err) {
          console.warn('[AdminService] Failed to send temp password email', err?.message || err);
        }

        // Send SMS if phone number provided
        try {
          if (saved.phoneNumber && this.smsService) {
            const smsMessage = `Your QuickMed temporary password: ${tempPassword}. Please change it after first login.`;
            await this.smsService.sendSms(saved.phoneNumber, smsMessage);
          }
        } catch (err) {
          console.warn('[AdminService] Failed to send temp password SMS', err?.message || err);
        }

        // return user without password field
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = saved as any;
        return userWithoutPassword;
      } else {
        // Non-patient (e.g., doctor): create an invite token workflow
        user.password = null;
        user.inviteToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        const expires = new Date();
        expires.setDate(expires.getDate() + 7); // invite valid 7 days
        user.inviteExpiresAt = expires;
      }
    }

    const finalSaved = await this.userRepository.save(user);
    const { password: __, ...result } = finalSaved as any;
    return result;
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.mustChangePassword = false;
    await this.userRepository.save(user);
  }

  async resetUserPasswordByEmail(email: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.mustChangePassword = false;
    await this.userRepository.save(user);
  }

  private generateTempPassword(): string {
    // Randomly pick a style
    const rand = Math.floor(Math.random() * 3);
    const digits = () => Math.floor(1000 + Math.random() * 9000).toString();
    const fiveDigits = () => Math.floor(10000 + Math.random() * 90000).toString();
    switch (rand) {
      case 0:
        return `QM-${fiveDigits()}`;
      case 1:
        return `Patient@${new Date().getFullYear()}`;
      default:
        return `TempPass#${digits()}`;
    }
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
  async getAllAppointments(page = 1, limit = 10, status?: string, search?: string) {
    const query = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('appointment.doctor', 'doctor');
    
    const conditions: string[] = [];
    const params: any = {};
    
    if (status) {
      conditions.push('appointment.status = :status');
      params.status = status;
    }
    
    if (search) {
      const likeTerm = `%${search.toLowerCase()}%`;
      conditions.push('(LOWER(patient.firstName) LIKE :likeTerm OR LOWER(patient.lastName) LIKE :likeTerm OR LOWER(patient.email) LIKE :likeTerm OR LOWER(doctor.firstName) LIKE :likeTerm OR LOWER(doctor.lastName) LIKE :likeTerm OR LOWER(appointment.reason) LIKE :likeTerm OR LOWER(appointment.notes) LIKE :likeTerm)');
      params.likeTerm = likeTerm;
    }
    
    if (conditions.length > 0) {
      query.where(conditions.join(' AND '), params);
    }
    
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
    const doctor = await this.userRepository.findOne({ where: { id: dto.doctorId, role: UserRole.DOCTOR } })
    if (!doctor) throw new BadRequestException("Invalid doctor ID")

    const patient = await this.userRepository.findOne({ where: { id: dto.patientId, role: UserRole.PATIENT } })
    if (!patient) throw new BadRequestException("Invalid patient ID")

    // Check for conflicting appointments
    const appointmentDate = typeof dto.appointmentDate === 'string' 
      ? new Date(dto.appointmentDate) 
      : dto.appointmentDate;
    
    const existingAppointment = await this.appointmentRepository.findOne({
      where: {
        doctorId: dto.doctorId,
        appointmentDate: appointmentDate,
        appointmentTime: dto.appointmentTime,
        status: AppointmentStatus.CONFIRMED,
      },
    });

    if (existingAppointment) {
      throw new BadRequestException("Doctor already has an appointment at this time");
    }

    const appointment = this.appointmentRepository.create({
      ...dto,
      status: dto.status ?? AppointmentStatus.PENDING,
      appointmentType: dto.appointmentType ?? AppointmentType.CONSULTATION,
      duration: dto.duration ?? 30,
    })

    const saved = await this.appointmentRepository.save(appointment);
    
    // Load relations for response
    return this.appointmentRepository.findOne({
      where: { id: saved.id },
      relations: ['patient', 'doctor'],
    });
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

  async getDoctorsOverview(search?: string, status?: 'active' | 'pending', specialty?: string) {
    const query = this.userRepository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.doctorAppointments', 'appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .where('doctor.role = :role', { role: UserRole.DOCTOR });

    if (search) {
      const likeTerm = `%${search.toLowerCase()}%`;
      query.andWhere(
        '(LOWER(doctor.firstName) LIKE :likeTerm OR LOWER(doctor.lastName) LIKE :likeTerm OR LOWER(doctor.email) LIKE :likeTerm OR LOWER(doctor.specialty) LIKE :likeTerm)',
        { likeTerm },
      );
    }

    if (specialty && specialty !== 'all') {
      query.andWhere('LOWER(doctor.specialty) = :specialty', { specialty: specialty.toLowerCase() });
    }

    if (status === 'active') {
      query.andWhere('doctor.isActive = :active', { active: true });
    } else if (status === 'pending') {
      query.andWhere('doctor.isActive = :active', { active: false });
    }

    const doctors = await query.orderBy('doctor.createdAt', 'DESC').getMany();

    // Fetch aggregated ratings per doctor when reviews service is available
    let allRatings: { [doctorId: string]: { average: number; count: number } } = {};
    if (this.reviewsService && typeof this.reviewsService.getAllDoctorRatings === 'function') {
      try {
        allRatings = await this.reviewsService.getAllDoctorRatings();
      } catch (e) {
        // non-fatal: keep ratings defaulted below
        allRatings = {};
      }
    }

    const cards = doctors.map((doctor) => {
      const appointments = doctor.doctorAppointments || [];
      const uniquePatients = new Set(
        appointments
          .map((appt) => appt?.patient?.id || appt.patientId)
          .filter((id) => !!id),
      );

      const ratingData = allRatings[doctor.id];
      const rating = ratingData ? Math.min(5, Number(ratingData.average.toFixed(1))) : 0;

      const statusLabel = doctor.isActive
        ? 'active'
        : doctor.licenseValidated && doctor.employmentConfirmed
        ? 'ready'
        : 'pending';

      return {
        id: doctor.id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        specialty: doctor.specialty,
        licenseNumber: doctor.licenseNumber,
        email: doctor.email,
        avatar: doctor.avatar,
        phoneNumber: doctor.phoneNumber,
        availableDays: doctor.availableDays,
        status: statusLabel,
        rating,
        stats: {
          patients: uniquePatients.size,
          appointments: appointments.length,
          videoVisits: appointments.filter((a) => !!a?.isVideoConsultation).length,
        },
        verification: {
          licenseValidated: doctor.licenseValidated,
          employmentConfirmed: doctor.employmentConfirmed,
        },
      };
    });

    const stats = {
      totalDoctors: cards.length,
      activeDoctors: cards.filter((c) => c.status === 'active').length,
      pendingDoctors: cards.filter((c) => c.status !== 'active').length,
    };

    const specialties = Array.from(
      new Set(
        doctors
          .map((doctor) => doctor.specialty)
          .filter((spec): spec is string => !!spec),
      ),
    ).sort();

    return { doctors: cards, stats, specialties };
  }

  async getAnalyticsData(startDate?: Date, endDate?: Date) {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default last 30 days
      const end = endDate || new Date();

      // Get appointment trends
      const appointments = await this.appointmentRepository.find({
        where: {
          appointmentDate: Between(start, end),
        },
        relations: ['patient', 'doctor'],
      });

    // Group by date
    const appointmentsByDate: { [key: string]: number } = {};
    appointments.forEach(apt => {
      const dateKey = new Date(apt.appointmentDate).toISOString().split('T')[0];
      appointmentsByDate[dateKey] = (appointmentsByDate[dateKey] || 0) + 1;
    });

    // Status distribution
    const statusDistribution = {
      pending: appointments.filter(a => a.status === AppointmentStatus.PENDING).length,
      confirmed: appointments.filter(a => a.status === AppointmentStatus.CONFIRMED).length,
      completed: appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length,
      cancelled: appointments.filter(a => a.status === AppointmentStatus.CANCELLED).length,
    };

    // Doctor performance
    const doctorStats = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .select('doctor.id', 'doctorId')
      .addSelect('doctor.firstName', 'firstName')
      .addSelect('doctor.lastName', 'lastName')
      .addSelect('COUNT(appointment.id)', 'totalAppointments')
      .addSelect('COUNT(CASE WHEN appointment.status = :completed THEN 1 END)', 'completedCount')
      .leftJoin('appointment.doctor', 'doctor')
      .where('appointment.appointmentDate BETWEEN :start AND :end', { start, end })
      .setParameter('completed', AppointmentStatus.COMPLETED)
      .groupBy('doctor.id')
      .addGroupBy('doctor.firstName')
      .addGroupBy('doctor.lastName')
      .orderBy('totalAppointments', 'DESC')
      .limit(10)
      .getRawMany();

    // Patient growth - use safer date extraction
    let patientsByDate: Array<{ date: string; count: number }> = [];
    try {
      const patients = await this.userRepository.find({
        where: {
          role: UserRole.PATIENT,
          createdAt: Between(start, end),
        },
        select: ['createdAt'],
      });
      
      // Group by date manually
      const patientsByDateMap: { [key: string]: number } = {};
      patients.forEach(patient => {
        if (patient.createdAt) {
          const dateKey = new Date(patient.createdAt).toISOString().split('T')[0];
          patientsByDateMap[dateKey] = (patientsByDateMap[dateKey] || 0) + 1;
        }
      });
      
      patientsByDate = Object.entries(patientsByDateMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('[AdminService] Error fetching patient growth:', error);
      patientsByDate = [];
    }

    // Revenue trends
    const revenueByDate: { [key: string]: number } = {};
    appointments
      .filter(a => a.status === AppointmentStatus.COMPLETED)
      .forEach(apt => {
        const dateKey = new Date(apt.appointmentDate).toISOString().split('T')[0];
        revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + 150; // example price
      });

      return {
        appointmentsByDate,
        statusDistribution,
        doctorStats: doctorStats.map(d => ({
          doctorId: d.doctorId,
          name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
          totalAppointments: parseInt(d.totalAppointments || '0'),
          completedCount: parseInt(d.completedCount || '0'),
          completionRate: d.totalAppointments && parseInt(d.totalAppointments) > 0
            ? (parseInt(d.completedCount || '0') / parseInt(d.totalAppointments) * 100).toFixed(1)
            : '0.0',
        })),
        patientsByDate: patientsByDate || [],
        revenueByDate,
        totalRevenue: Object.values(revenueByDate).reduce((sum, val) => sum + val, 0),
        period: { start, end },
      };
    } catch (error) {
      console.error('[AdminService] Analytics error:', error);
      return {
        appointmentsByDate: {},
        statusDistribution: { pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
        doctorStats: [],
        patientsByDate: [],
        revenueByDate: {},
        totalRevenue: 0,
        period: { 
          start: (startDate || new Date()).toISOString().split('T')[0], 
          end: (endDate || new Date()).toISOString().split('T')[0] 
        },
        error: 'Failed to generate analytics data',
      };
    }
  }
}
