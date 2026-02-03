import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { AppointmentStatus, PaymentStatus, UserRole } from '../common/index';
import { Message } from '../messages/entities/message.entity';
import { ReceptionistMessage } from './entities/receptionist-message.entity';
import { SendReceptionistMessageDto } from './dto/send-receptionist-message.dto';
import { CreateReceptionistInviteDto } from './dto/create-receptionist-invite.dto';
import { EmailService } from '../common/services/email.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReceptionistService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Message) private readonly messageRepo: Repository<Message>,
    @InjectRepository(ReceptionistMessage) private readonly receptionistMessageRepo: Repository<ReceptionistMessage>,
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

  async getPendingPaymentsCountForToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.appointmentDate >= :today AND a.appointmentDate < :tomorrow', { today, tomorrow })
      .andWhere('a.paymentStatus IN (:...statuses)', { statuses: [PaymentStatus.NOT_PAID, PaymentStatus.PENDING] })
      .getCount();
  }

  async getCheckedInCountForToday(filter?: { doctorId?: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.appointmentDate >= :today AND a.appointmentDate < :tomorrow', { today, tomorrow })
      .andWhere('a.arrived = :arrived', { arrived: true });

    if (filter?.doctorId) qb.andWhere('a.doctorId = :doctorId', { doctorId: filter.doctorId });

    return qb.getCount();
  }

  async getUnreadMessagesCount(userId?: string) {
    if (!userId) return 0;
    return this.messageRepo.count({ where: { receiverId: userId, isRead: false } });
  }

  async getWaitingPatients() {
    return this.appointmentRepo.find({ where: { status: AppointmentStatus.WAITING }, relations: ['patient', 'doctor'] });
  }

  async getDashboardInsights(filter?: { doctorId?: string; status?: string; userId?: string }) {
    const [todayAppointments, pendingPayments, waiting, checkedInCount, pendingPaymentsCount, unreadMessages] = await Promise.all([
      this.getTodayAppointments(filter),
      this.getPendingPayments(),
      this.getWaitingPatients(),
      this.getCheckedInCountForToday(filter),
      this.getPendingPaymentsCountForToday(),
      this.getUnreadMessagesCount(filter?.userId),
    ]);

    const stats = {
      totalToday: todayAppointments.length,
      checkedIn: checkedInCount,
      waitingRoom: waiting.length,
      paymentsDue: pendingPaymentsCount,
      messages: unreadMessages,
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

    const appointmentsTable = todayAppointments.map((appt) => ({
      id: appt.id,
      patientName: `${appt.patient?.firstName || ''} ${appt.patient?.lastName || ''}`.trim(),
      doctorName: `${appt.doctor?.firstName || ''} ${appt.doctor?.lastName || ''}`.trim(),
      time: appt.appointmentTime,
      status: appt.status,
      arrived: appt.arrived,
      paymentStatus: appt.paymentStatus,
    }));

    return {
      todayAppointments,
      pendingPayments,
      waiting,
      stats,
      timeline,
      recentPatients,
      tasks,
      appointmentsTable,
    };
  }

  async createReceptionistInvite(dto: CreateReceptionistInviteDto): Promise<{
    receptionist: Partial<User>;
    emailSent: boolean;
    inviteLink?: string;
    previewUrl?: string;
  }> {
    // Use transaction to ensure data integrity
    const queryRunner = this.userRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();
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

      const tempPassword = this.generateTempPassword();
      const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

      // Create receptionist user with invitation data
      const receptionist = queryRunner.manager.create(User, {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: normalizedEmail,
        phoneNumber: dto.phoneNumber?.trim() || null,
        role: UserRole.RECEPTIONIST,
        isActive: true, // Allow login with temporary password
        inviteToken,
        inviteExpiresAt,
        password: hashedTempPassword,
        mustChangePassword: true,
      });

      const savedReceptionist = await queryRunner.manager.save(receptionist);

      // Commit transaction before sending email (non-critical operation)
      await queryRunner.commitTransaction();

      // Generate invite link
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/set-password?token=${inviteToken}&uid=${savedReceptionist.id}`;

      // Send invitation email (non-blocking)
      let emailResult: { sent: boolean; fallbackLink?: string; previewUrl?: string } = { sent: false, fallbackLink: inviteLink };
      try {
        const result = await this.emailService.sendReceptionistInvite(
          savedReceptionist.email,
          inviteLink,
          savedReceptionist.firstName,
          tempPassword
        );
        emailResult = {
          sent: result.sent,
          fallbackLink: result.fallbackLink || inviteLink,
          previewUrl: result.previewUrl,
        };
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
        previewUrl: emailResult.previewUrl,
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

    console.log('[ReceptionistService] setReceptionistPassword attempt', {
      uid,
      tokenProvided: !!token,
      tokenLength: token ? token.length : 0,
    });

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

      if (receptionist.isActive && receptionist.password && !receptionist.mustChangePassword) {
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
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
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

  async listReceptionistThreads(senderId: string) {
    const messages = await this.receptionistMessageRepo.find({
      where: { senderId },
      relations: ['receiver'],
      order: { createdAt: 'DESC' },
      take: 200,
    });

    const threads = new Map<string, any>();
    for (const msg of messages) {
      if (threads.has(msg.receiverId)) continue;
      threads.set(msg.receiverId, {
        receiverId: msg.receiverId,
        receiverRole: msg.receiverRole,
        receiverName: `${msg.receiver?.firstName || ''} ${msg.receiver?.lastName || ''}`.trim(),
        receiverAvatar: msg.receiver?.avatar || null,
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt,
      });
    }

    return Array.from(threads.values());
  }

  async getReceptionistThread(senderId: string, receiverId: string) {
    return this.receptionistMessageRepo.find({
      where: { senderId, receiverId },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'ASC' },
    });
  }

  async sendReceptionistMessage(senderId: string, dto: SendReceptionistMessageDto) {
    if (![UserRole.PATIENT, UserRole.DOCTOR].includes(dto.receiverRole)) {
      throw new BadRequestException('Receiver must be a patient or doctor');
    }

    const receiver = await this.userRepo.findOne({ where: { id: dto.receiverId, role: dto.receiverRole } });
    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    const message = this.receptionistMessageRepo.create({
      senderId,
      receiverId: dto.receiverId,
      receiverRole: dto.receiverRole,
      content: dto.content,
      isRead: false,
    });

    return this.receptionistMessageRepo.save(message);
  }

  private generateTempPassword(length = 10): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$";
    let pwd = "";
    for (let i = 0; i < length; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd;
  }
}
