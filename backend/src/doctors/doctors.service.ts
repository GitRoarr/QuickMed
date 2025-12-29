import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { User } from "../users/entities/user.entity";
import { Appointment } from "../appointments/entities/appointment.entity";
import { CreateDoctorDto } from "./dto/create-doctor.dto";
import { UpdateDoctorDto } from "./dto/update-doctor.dto";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { UserRole, AppointmentStatus, PaymentStatus } from "../common/index";
import { Payment } from "../payments/entities/payment.entity";
import { MessagesService } from "../messages/messages.service";
import { EmailService } from "../common/services/email.service";
import { ReviewsService } from "../reviews/reviews.service";

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly emailService: EmailService,
    private readonly reviewsService: ReviewsService,
    private readonly messagesService: MessagesService
  ) {}

  private sanitizeDoctor(doctor: User) {
    const { password, inviteToken, inviteExpiresAt, ...safeDoctor } = doctor;
    return safeDoctor;
  }

  async createDoctorInvite(createDoctorDto: CreateDoctorDto): Promise<{
    doctor: Partial<User>;
    emailSent: boolean;
    inviteLink?: string;
  }> {
    // Use transaction to ensure data integrity
    const queryRunner = this.usersRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log("[DoctorsService] Creating doctor invite for", createDoctorDto.email);
      
      const normalizedEmail = createDoctorDto.email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Invalid email format');
      }

      const existingUser = await queryRunner.manager.findOne(User, { 
        where: { email: normalizedEmail } 
      });
      if (existingUser) {
        console.log("[DoctorsService] Email already exists:", createDoctorDto.email);
        await queryRunner.rollbackTransaction();
        throw new BadRequestException("Email already exists");
      }

      if (!createDoctorDto.firstName || !createDoctorDto.lastName || !createDoctorDto.email) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException("First name, last name, and email are required");
      }

      let inviteToken: string;
      let tokenExists = true;
      let attempts = 0;
      while (tokenExists && attempts < 10) {
        inviteToken = uuidv4();
        const existingToken = await queryRunner.manager.findOne(User, {
          where: { inviteToken },
        });
        tokenExists = !!existingToken;
        attempts++;
      }
      if (tokenExists) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Failed to generate unique invite token. Please try again.');
      }

      const inviteExpiresAt = new Date();
      inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 days expiry

      const doctor = queryRunner.manager.create(User, {
        firstName: createDoctorDto.firstName.trim(),
        lastName: createDoctorDto.lastName.trim(),
        email: normalizedEmail,
        phoneNumber: createDoctorDto.phoneNumber,
        specialty: createDoctorDto.specialty,
        licenseNumber: createDoctorDto.licenseNumber,
        bio: createDoctorDto.bio,
        role: UserRole.DOCTOR,
        isActive: false, // Inactive until password is set
        inviteToken,
        inviteExpiresAt,
        licenseValidated: false,
        employmentConfirmed: false,
        password: null, // No password until invitation is accepted
      });

      const savedDoctor = await queryRunner.manager.save(doctor);
      
      // Commit transaction before sending email (non-critical operation)
      await queryRunner.commitTransaction();

      // Generate invite link
      const inviteLink = `${process.env.FRONTEND_URL || "http://localhost:4200"}/set-password?token=${inviteToken}&uid=${savedDoctor.id}`;
      
      // Send invitation email (non-blocking)
      let emailResult: { sent: boolean; fallbackLink?: string } = { sent: false, fallbackLink: inviteLink };
      try {
        const result = await this.emailService.sendDoctorInvite(savedDoctor.email, inviteLink);
        emailResult = { sent: result.sent, fallbackLink: result.fallbackLink || inviteLink };
      } catch (emailError) {
        console.error("[DoctorsService] Failed to send email, but invitation created:", emailError);
        // Don't fail the whole operation if email fails
        emailResult = { sent: false, fallbackLink: inviteLink };
      }

      console.log("[DoctorsService] Doctor invite created", { 
        id: savedDoctor.id, 
        email: savedDoctor.email,
        emailSent: emailResult.sent 
      });

      return {
        doctor: this.sanitizeDoctor(savedDoctor),
        emailSent: emailResult.sent,
        inviteLink: emailResult.sent ? undefined : emailResult.fallbackLink || inviteLink,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("[DoctorsService] Failed to create doctor invite:", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async setDoctorPassword(uid: string, token: string, password: string): Promise<User> {
    // Validate password strength (must match DTO validation: MinLength(8))
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    // Use transaction for data integrity
    const queryRunner = this.usersRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find doctor with proper locking to prevent race conditions
      const doctor = await queryRunner.manager.findOne(User, { 
        where: { id: uid, role: UserRole.DOCTOR },
        lock: { mode: 'pessimistic_write' }
      });

      if (!doctor) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException('Doctor not found');
      }

      if (doctor.isActive && doctor.password) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Doctor already has a password set. Please use password reset instead.');
      }

      if (!doctor.inviteToken) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('No active invitation found for this doctor');
      }

      if (doctor.inviteToken !== token) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Invalid invite token');
      }

      if (!doctor.inviteExpiresAt || new Date() > doctor.inviteExpiresAt) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Invite token has expired. Please request a new invitation.');
      }

      // Hash password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      doctor.password = hashedPassword;
      doctor.isActive = true;
      doctor.inviteToken = null;
      doctor.inviteExpiresAt = null;
      doctor.mustChangePassword = false;

      const savedDoctor = await queryRunner.manager.save(doctor);
      await queryRunner.commitTransaction();

      console.log(`[DoctorsService] Password set successfully for doctor: ${doctor.email}`);
      return this.sanitizeDoctor(savedDoctor) as User;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('[DoctorsService] Failed to set doctor password:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async validateLicense(doctorId: string): Promise<User> {
    const doctor = await this.usersRepository.findOne({ where: { id: doctorId, role: UserRole.DOCTOR } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    doctor.licenseValidated = true;
    return this.usersRepository.save(doctor);
  }

  async confirmEmployment(doctorId: string): Promise<User> {
    const doctor = await this.usersRepository.findOne({ where: { id: doctorId, role: UserRole.DOCTOR } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    doctor.employmentConfirmed = true;
    return this.usersRepository.save(doctor);
  }

  async activateDoctor(doctorId: string): Promise<User> {
    const doctor = await this.usersRepository.findOne({ where: { id: doctorId, role: UserRole.DOCTOR } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (!doctor.licenseValidated || !doctor.employmentConfirmed)
      throw new BadRequestException('Doctor cannot be activated yet');
    doctor.isActive = true;
    return this.usersRepository.save(doctor);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ where: { role: UserRole.DOCTOR } });
  }

  async findOne(id: string): Promise<User> {
    const doctor = await this.usersRepository.findOne({ where: { id, role: UserRole.DOCTOR } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async update(id: string, updateDoctorDto: UpdateDoctorDto): Promise<User> {
    const doctor = await this.findOne(id);
    if (updateDoctorDto.password)
      updateDoctorDto.password = await bcrypt.hash(updateDoctorDto.password, 10);
    Object.assign(doctor, updateDoctorDto);
    return this.usersRepository.save(doctor);
  }

  async remove(id: string): Promise<void> {
    const doctor = await this.findOne(id);
    await this.appointmentsRepository.delete({ doctorId: id });
    await this.usersRepository.remove(doctor);
  }

  async getMyPatients(doctorId: string) {
    const appointments = await this.appointmentsRepository.find({
      where: { doctorId },
      relations: ['patient'],
      order: {
        appointmentDate: 'DESC',
        appointmentTime: 'DESC',
      },
    });

    const map = new Map<string, any>();

    for (const appt of appointments) {
      if (!appt.patient) continue;
      const key = appt.patientId;
      if (!map.has(key)) {
        map.set(key, {
          patientId: appt.patientId,
          firstName: appt.patient.firstName,
          lastName: appt.patient.lastName,
          email: appt.patient.email,
          phoneNumber: appt.patient.phoneNumber,
          lastAppointmentDate: appt.appointmentDate,
          lastAppointmentTime: appt.appointmentTime,
          lastStatus: appt.status,
          totalAppointments: 1,
          isActive: appt.patient.isActive,
        });
      } else {
        const current = map.get(key);
        current.totalAppointments += 1;
      }
    }

    return Array.from(map.values());
  }

  async getDashboardData(doctorId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await this.appointmentsRepository.find({
      where: {
        doctorId,
        appointmentDate: Between(today, tomorrow),
      },
      relations: ['patient'],
      order: { appointmentTime: 'ASC' },
    });

    const allAppointments = await this.appointmentsRepository.find({
      where: { doctorId },
      relations: ['patient'],
    });

    const totalToday = todayAppointments.length;
    const pendingToday = todayAppointments.filter(a => a.status === AppointmentStatus.PENDING).length;
    const completedToday = todayAppointments.filter(a => a.status === AppointmentStatus.COMPLETED).length;
    const confirmedToday = todayAppointments.filter(a => a.status === AppointmentStatus.CONFIRMED).length;

    const uniquePatients = new Set(allAppointments.map(a => a.patientId));
    const totalPatients = uniquePatients.size;

    const avgConsultationTime = 32;

    const { average: satisfactionRate, count: satisfactionCount } = await this.reviewsService.getDoctorRating(doctorId);

    const appointmentsByTime: { [key: string]: { completed: number; pending: number } } = {};
    const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
    timeSlots.forEach(slot => {
      appointmentsByTime[slot] = { completed: 0, pending: 0 };
    });
    todayAppointments.forEach(apt => {
      const timeSlot = apt.appointmentTime.substring(0, 5);
      const slot = timeSlots.find(s => s === timeSlot) || timeSlot;
      if (!appointmentsByTime[slot]) {
        appointmentsByTime[slot] = { completed: 0, pending: 0 };
      }
      if (apt.status === AppointmentStatus.COMPLETED) {
        appointmentsByTime[slot].completed++;
      } else if (apt.status === AppointmentStatus.PENDING || apt.status === AppointmentStatus.CONFIRMED) {
        appointmentsByTime[slot].pending++;
      }
    });

    const recentPatients = Array.from(uniquePatients)
      .slice(0, 5)
      .map(patientId => {
        const patientAppt = allAppointments.find(a => a.patientId === patientId);
        return patientAppt?.patient;
      })
      .filter(Boolean);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayAppointments = await this.appointmentsRepository.count({
      where: {
        doctorId,
        appointmentDate: Between(yesterday, today),
      },
    });

    const revenueRaw = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin(Appointment, 'appointment', 'appointment.id = payment.appointmentId')
      .where('appointment.doctorId = :doctorId', { doctorId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PAID })
      .andWhere('payment.paidAt BETWEEN :start AND :end', { start: today, end: tomorrow })
      .select('COALESCE(SUM(payment.amount), 0)', 'sum')
      .getRawOne();

    const revenueToday = Number(revenueRaw?.sum || 0);

    const unreadMessages = await this.messagesService.getUnreadCount({ id: doctorId, role: UserRole.DOCTOR });

    return {
      stats: {
        todayAppointments: totalToday,
        pendingConfirmations: pendingToday,
        totalPatients,
        avgConsultationTime,
        satisfactionRate,
        completedToday,
        confirmedToday,
        revenueToday,
        unreadMessages: unreadMessages?.count ?? 0,
      },
      todayAppointments: todayAppointments.map(apt => ({
        id: apt.id,
        time: apt.appointmentTime,
        patient: apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Unknown',
        patientId: apt.patientId,
        type: apt.appointmentType || 'Consultation',
        status: apt.status,
        reason: apt.reason || apt.notes || '',
        isVideoConsultation: apt.isVideoConsultation || false,
      })),
      appointmentsByTime,
      recentPatients: recentPatients.slice(0, 4).map(p => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        avatar: p.avatar,
      })),
      trends: {
        appointmentsChange: totalToday - yesterdayAppointments,
        patientsChange: 8, // Mock: +8% from last month
        consultationChange: -2, // Mock: -2 min improvement
        satisfactionChange: satisfactionCount > 1 ? 0.2 : 0, // placeholder change until historical calc added
      },
    };
  }

  async getStats(doctorId: string) {
    const allAppointments = await this.appointmentsRepository.find({
      where: { doctorId },
      relations: ['patient'],
    });

    const uniquePatients = new Set(allAppointments.map(a => a.patientId));
    
    return {
      totalAppointments: allAppointments.length,
      totalPatients: uniquePatients.size,
      pending: allAppointments.filter(a => a.status === AppointmentStatus.PENDING).length,
      confirmed: allAppointments.filter(a => a.status === AppointmentStatus.CONFIRMED).length,
      completed: allAppointments.filter(a => a.status === AppointmentStatus.COMPLETED).length,
      cancelled: allAppointments.filter(a => a.status === AppointmentStatus.CANCELLED).length,
    };
  }

  async getAnalytics(doctorId: string, period: string = '6months') {
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 6);
    }

    const allAppointments = await this.appointmentsRepository.find({
      where: {
        doctorId,
        appointmentDate: Between(startDate, now),
      },
      relations: ['patient'],
    });

    const completed = allAppointments.filter(a => a.status === AppointmentStatus.COMPLETED).length;
    const cancelled = allAppointments.filter(a => a.status === AppointmentStatus.CANCELLED).length;
    const total = allAppointments.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    const uniquePatients = new Set(allAppointments.map(a => a.patientId));
    
    const firstAppointments = await this.appointmentsRepository
      .createQueryBuilder('appointment')
      .select('MIN(appointment.appointmentDate)', 'firstDate')
      .addSelect('appointment.patientId', 'patientId')
      .where('appointment.doctorId = :doctorId', { doctorId })
      .groupBy('appointment.patientId')
      .getRawMany();

    const newPatients = firstAppointments.filter(
      (fa: any) => new Date(fa.firstDate) >= startDate
    ).length;

    const monthlyData: { [key: string]: { completed: number; cancelled: number; noShow: number } } = {};
    allAppointments.forEach(apt => {
      const monthKey = new Date(apt.appointmentDate).toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { completed: 0, cancelled: 0, noShow: 0 };
      }
      if (apt.status === AppointmentStatus.COMPLETED) {
        monthlyData[monthKey].completed++;
      } else if (apt.status === AppointmentStatus.CANCELLED) {
        monthlyData[monthKey].cancelled++;
      }
    });

    const { average: patientSatisfaction, count: satisfactionCount } = await this.reviewsService.getDoctorRating(doctorId);
    const satisfactionTrend = [patientSatisfaction || 0];

    return {
      kpis: {
        totalAppointments: total,
        completionRate: parseFloat(completionRate.toFixed(1)),
        patientSatisfaction: patientSatisfaction,
        newPatients: newPatients,
      },
      trends: {
        appointmentsChange: 12, // Mock - calculate from previous period
        completionChange: 2.1,
        satisfactionChange: satisfactionCount > 1 ? 0.2 : 0,
        newPatientsChange: 7,
      },
      appointmentTrends: monthlyData,
      satisfactionTrend: satisfactionTrend,
    };
  }
}
