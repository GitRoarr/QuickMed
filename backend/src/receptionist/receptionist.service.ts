import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { AppointmentStatus, PaymentStatus, UserRole } from '../common/index';
import { CreateReceptionistInviteDto } from './dto/create-receptionist-invite.dto';
import { EmailService } from '../common/services/email.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReceptionistService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
  ) { }

  async getTodayAppointments(filter?: { doctorId?: string; status?: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const qb = this.appointmentRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .leftJoinAndSelect('a.receptionist', 'receptionist')
      .where('a.appointmentDate >= :today AND a.appointmentDate < :tomorrow', { today, tomorrow });

    if (filter?.doctorId) qb.andWhere('a.doctorId = :doctorId', { doctorId: filter.doctorId });
    if (filter?.status) qb.andWhere('a.status = :status', { status: filter.status });

    return qb.orderBy('a.appointmentTime', 'ASC').getMany();
  }

  async getPendingPayments() {
    return this.appointmentRepo.find({ where: { paymentStatus: PaymentStatus.NOT_PAID }, relations: ['patient', 'doctor'] });
  }

  async getWaitingPatients() {
    return this.appointmentRepo.find({ where: { status: AppointmentStatus.WAITING }, relations: ['patient', 'doctor'] });
  }

  async getDashboardInsights(filter?: { doctorId?: string; status?: string }) {
    const [todayAppointments, pendingPayments, waiting] = await Promise.all([
      this.getTodayAppointments(filter),
      this.getPendingPayments(),
      this.getWaitingPatients(),
    ]);

    const stats = {
      totalToday: todayAppointments.length,
      waitingRoom: waiting.length,
      paymentsDue: pendingPayments.length,
      videoVisits: todayAppointments.filter((appt) => appt.isVideoConsultation).length,
    };

    const timeline = todayAppointments
      .map((appt) => ({
        id: appt.id,
        time: appt.appointmentTime,
        patient: `${appt.patient?.firstName || ''} ${appt.patient?.lastName || ''}`.trim(),
        doctor: `${appt.doctor?.firstName || ''} ${appt.doctor?.lastName || ''}`.trim(),
        type: appt.isVideoConsultation ? 'Video' : 'In-person',
        status: appt.status,
      }))
      .slice(0, 6);

    const recentPatients = todayAppointments
      .map((appt) => ({
        id: appt.patient?.id,
        name: `${appt.patient?.firstName || ''} ${appt.patient?.lastName || ''}`.trim(),
        appointmentTime: appt.appointmentTime,
        doctor: appt.doctor?.lastName,
      }))
      .slice(0, 4);

    const tasks = [
      { id: 'insurance-check', title: 'Confirm insurance for afternoon patients', status: 'in_progress' },
      { id: 'follow-up-calls', title: 'Call no-show patients from yesterday', status: 'pending' },
      { id: 'prepare-lab', title: 'Prepare lab documents for Dr. Chen', status: 'completed' },
    ];

    return { todayAppointments, pendingPayments, waiting, stats, timeline, recentPatients, tasks };
  }

  async createReceptionistInvite(dto: CreateReceptionistInviteDto): Promise<{
    receptionist: Partial<User>;
    emailSent: boolean;
    inviteLink?: string;
  }> {
    // Use transaction to ensure data integrity
    const queryRunner = this.userRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log('[ReceptionistService] Creating receptionist invite for', dto.email);

      // Normalize and validate email
      const normalizedEmail = dto.email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Invalid email format');
      }

      // Check if email already exists (with transaction isolation)
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: normalizedEmail }
      });
      if (existingUser) {
        console.log('[ReceptionistService] Email already exists:', dto.email);
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Email already exists');
      }

      // Validate required fields
      if (!dto.firstName || !dto.lastName || !dto.email) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('First name, last name, and email are required');
      }

      // Generate unique invite token (ensure uniqueness)
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

      // Create receptionist user with invitation data
      const receptionist = queryRunner.manager.create(User, {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: normalizedEmail,
        phoneNumber: dto.phoneNumber?.trim() || null,
        role: UserRole.RECEPTIONIST,
        isActive: false, // Inactive until password is set
        inviteToken,
        inviteExpiresAt,
        password: null, // No password until invitation is accepted
      });

      const savedReceptionist = await queryRunner.manager.save(receptionist);

      // Commit transaction before sending email (non-critical operation)
      await queryRunner.commitTransaction();

      // Generate invite link
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/set-password?token=${inviteToken}&uid=${savedReceptionist.id}`;

      // Send invitation email (non-blocking)
      let emailResult: { sent: boolean; fallbackLink?: string } = { sent: false, fallbackLink: inviteLink };
      try {
        const result = await this.emailService.sendReceptionistInvite(
          savedReceptionist.email,
          inviteLink,
          savedReceptionist.firstName
        );
        emailResult = { sent: result.sent, fallbackLink: result.fallbackLink || inviteLink };
      } catch (emailError) {
        console.error('[ReceptionistService] Failed to send email, but invitation created:', emailError);
        // Don't fail the whole operation if email fails
        emailResult = { sent: false, fallbackLink: inviteLink };
      }

      console.log('[ReceptionistService] Receptionist invite created', {
        id: savedReceptionist.id,
        email: savedReceptionist.email,
        emailSent: emailResult.sent
      });

      // Return without sensitive data
      const { password, inviteToken: _, inviteExpiresAt: __, ...safeReceptionist } = savedReceptionist;

      return {
        receptionist: safeReceptionist,
        emailSent: emailResult.sent,
        inviteLink: emailResult.sent ? undefined : emailResult.fallbackLink || inviteLink,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('[ReceptionistService] Failed to create receptionist invite:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async setReceptionistPassword(uid: string, token: string, password: string): Promise<User> {
    // Validate password strength (must match DTO validation: MinLength(8))
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    // Use transaction for data integrity
    const queryRunner = this.userRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find receptionist with proper locking to prevent race conditions
      const receptionist = await queryRunner.manager.findOne(User, {
        where: { id: uid, role: UserRole.RECEPTIONIST },
        lock: { mode: 'pessimistic_write' }
      });

      if (!receptionist) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException('Receptionist not found');
      }

      if (receptionist.isActive && receptionist.password) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Receptionist already has a password set. Please use password reset instead.');
      }

      if (!receptionist.inviteToken) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('No active invitation found for this receptionist');
      }

      if (receptionist.inviteToken !== token) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Invalid invite token');
      }

      if (!receptionist.inviteExpiresAt || new Date() > receptionist.inviteExpiresAt) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Invite token has expired. Please request a new invitation.');
      }

      // Hash password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update receptionist: set password, activate, and clear invitation
      receptionist.password = hashedPassword;
      receptionist.isActive = true;
      receptionist.inviteToken = null;
      receptionist.inviteExpiresAt = null;
      receptionist.mustChangePassword = false;

      const savedReceptionist = await queryRunner.manager.save(receptionist);
      await queryRunner.commitTransaction();

      console.log(`[ReceptionistService] Password set successfully for receptionist: ${receptionist.email}`);

      // Return without sensitive data
      const { password: _, inviteToken: __, inviteExpiresAt: ___, ...safeReceptionist } = savedReceptionist;
      return safeReceptionist as User;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('[ReceptionistService] Failed to set receptionist password:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async listAppointments(filters?: {
    date?: string;
    doctorId?: string;
    status?: string;
    patientId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .leftJoinAndSelect('a.receptionist', 'receptionist')
      .orderBy('a.appointmentDate', 'DESC')
      .addOrderBy('a.appointmentTime', 'ASC');

    if (filters?.date) {
      const date = new Date(filters.date);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      qb.where('a.appointmentDate >= :date', { date })
        .andWhere('a.appointmentDate < :nextDay', { nextDay });
    } else if (filters?.startDate && filters?.endDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      qb.where('a.appointmentDate >= :start', { start })
        .andWhere('a.appointmentDate <= :end', { end });
    }

    if (filters?.doctorId) {
      qb.andWhere('a.doctorId = :doctorId', { doctorId: filters.doctorId });
    }

    if (filters?.status) {
      qb.andWhere('a.status = :status', { status: filters.status });
    }

    if (filters?.patientId) {
      qb.andWhere('a.patientId = :patientId', { patientId: filters.patientId });
    }

    return qb.getMany();
  }
}
