import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { AppointmentStatus, PaymentStatus, UserRole } from '../common/index';
import { Message } from '../messages/entities/message.entity';
import { ReceptionistMessage } from './entities/receptionist-message.entity';
import { ReceptionistInvitation, InviteStatus } from './entities/receptionist-invitation.entity';
import { SendReceptionistMessageDto } from './dto/send-receptionist-message.dto';
import { SchedulesService } from '../schedules/schedules.service';
import { Payment } from '../payments/entities/payment.entity';
import { DoctorService } from '../settings/entities/doctor-service.entity';
import { CreateReceptionistInviteDto, ResendInviteDto, RevokeInviteDto, BulkInviteDto } from './dto/create-receptionist-invite.dto';
import { ReceptionistTask } from './entities/receptionist-task.entity';
import { EmailService } from '../common/services/email.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { MessagesService } from '../messages/messages.service';

@Injectable()
export class ReceptionistService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Message) private readonly messageRepo: Repository<Message>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(ReceptionistInvitation) private readonly invitationRepo: Repository<ReceptionistInvitation>,
    @InjectRepository(ReceptionistTask) private readonly taskRepo: Repository<ReceptionistTask>,
    @InjectRepository(DoctorService) private readonly serviceRepo: Repository<DoctorService>,
    private readonly emailService: EmailService,
    private readonly schedulesService: SchedulesService,
    private readonly messagesService: MessagesService,
  ) { }

  /**
   * Get all services for a specific doctor
   */
  async getDoctorServices(doctorId: string): Promise<DoctorService[]> {
    return this.serviceRepo.find({
      where: { doctorId, isActive: true },
    });
  }

  // ============================================================
  // INVITATION MANAGEMENT — Production-Level
  // ============================================================

  /**
   * Create a new receptionist invitation with full lifecycle tracking
   */
  async createReceptionistInvite(dto: CreateReceptionistInviteDto, invitedById?: string): Promise<{
    receptionist: Partial<User>;
    invitation: Partial<ReceptionistInvitation>;
    emailSent: boolean;
    inviteLink?: string;
    previewUrl?: string;
  }> {
    const queryRunner = this.userRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();
      console.log('[ReceptionistService] Creating receptionist invite for', dto.email);

      // Normalize and validate email
      const normalizedEmail = dto.email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new BadRequestException('Invalid email format');
      }

      // Validate required fields
      if (!dto.firstName?.trim() || !dto.lastName?.trim()) {
        throw new BadRequestException('First name and last name are required');
      }

      // Check if email already exists as a user
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email: normalizedEmail }
      });
      if (existingUser) {
        throw new ConflictException('A user with this email already exists');
      }

      // Check if there's already a pending invitation for this email
      const existingInvite = await queryRunner.manager.findOne(ReceptionistInvitation, {
        where: { email: normalizedEmail, status: InviteStatus.PENDING }
      });
      if (existingInvite) {
        throw new ConflictException('A pending invitation already exists for this email. Please resend instead.');
      }

      // Generate unique invite token
      const inviteToken = await this.generateUniqueToken(queryRunner);
      const inviteExpiresAt = new Date();
      inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 days expiry

      const tempPassword = this.generateTempPassword();
      const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

      // Create receptionist user
      const receptionist = queryRunner.manager.create(User, {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: normalizedEmail,
        phoneNumber: dto.phoneNumber?.trim() || null,
        department: dto.department?.trim() || null,
        role: UserRole.RECEPTIONIST,
        isActive: true,
        inviteToken,
        inviteExpiresAt,
        password: hashedTempPassword,
        mustChangePassword: true,
      });

      const savedReceptionist = await queryRunner.manager.save(receptionist);

      // Create invitation tracking record
      const invitation = queryRunner.manager.create(ReceptionistInvitation, {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: normalizedEmail,
        phoneNumber: dto.phoneNumber?.trim() || null,
        department: dto.department?.trim() || null,
        personalMessage: dto.personalMessage?.trim() || null,
        inviteToken,
        expiresAt: inviteExpiresAt,
        status: InviteStatus.PENDING,
        invitedById: invitedById || null,
        acceptedUserId: savedReceptionist.id,
        emailDelivered: false,
        resendCount: 0,
      });

      const savedInvitation = await queryRunner.manager.save(invitation);
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

        // Update email delivery status
        if (result.sent) {
          await this.invitationRepo.update(savedInvitation.id, { emailDelivered: true });
        }
      } catch (emailError) {
        console.error('[ReceptionistService] Failed to send email, but invitation created:', emailError);
        emailResult = { sent: false, fallbackLink: inviteLink };
      }

      console.log("\n" + "=".repeat(60));
      console.log("🚀 RECEPTIONIST INVITATION PREVIEW");
      console.log(`📧 To: ${savedReceptionist.email}`);
      console.log(`🔗 Link: ${inviteLink}`);
      console.log(`🔑 Temp Password: ${tempPassword}`);
      console.log("=".repeat(60) + "\n");

      console.log('[ReceptionistService] Receptionist invite created', {
        id: savedReceptionist.id,
        email: savedReceptionist.email,
        invitationId: savedInvitation.id,
        emailSent: emailResult.sent
      });

      // Return without sensitive data
      const { password, inviteToken: _, inviteExpiresAt: __, ...safeReceptionist } = savedReceptionist;
      const { inviteToken: _t, ...safeInvitation } = savedInvitation;

      return {
        receptionist: safeReceptionist,
        invitation: safeInvitation,
        emailSent: emailResult.sent,
        inviteLink: emailResult.sent ? undefined : emailResult.fallbackLink || inviteLink,
        previewUrl: emailResult.previewUrl,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      console.error('[ReceptionistService] Failed to create receptionist invite:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Resend invitation email with new token
   */
  async resendInvite(dto: ResendInviteDto, invitedById?: string): Promise<{
    invitation: Partial<ReceptionistInvitation>;
    emailSent: boolean;
    inviteLink?: string;
    previewUrl?: string;
  }> {
    const queryRunner = this.userRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      const user = await queryRunner.manager.findOne(User, {
        where: { id: dto.userId, role: UserRole.RECEPTIONIST }
      });

      if (!user) {
        throw new NotFoundException('Receptionist not found');
      }

      if (!user.mustChangePassword) {
        throw new BadRequestException('This receptionist has already set their password. No invitation to resend.');
      }

      // Check resend rate limiting (max 5 resends per invite)
      const existingInvitation = await queryRunner.manager.findOne(ReceptionistInvitation, {
        where: { acceptedUserId: user.id, status: InviteStatus.PENDING },
        order: { createdAt: 'DESC' }
      });

      if (existingInvitation && existingInvitation.resendCount >= 5) {
        throw new BadRequestException('Maximum resend limit reached (5). Please revoke and create a new invitation.');
      }

      // Check cooldown (minimum 1 minute between resends)
      if (existingInvitation?.lastResentAt) {
        const cooldownMs = 60 * 1000; // 1 minute
        const timeSinceLastResend = Date.now() - existingInvitation.lastResentAt.getTime();
        if (timeSinceLastResend < cooldownMs) {
          const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastResend) / 1000);
          throw new BadRequestException(`Please wait ${remainingSeconds} seconds before resending.`);
        }
      }

      // Generate new token and extend expiry
      const newToken = await this.generateUniqueToken(queryRunner);
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      const tempPassword = this.generateTempPassword();
      const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

      // Update user's invite credentials
      user.inviteToken = newToken;
      user.inviteExpiresAt = newExpiry;
      user.password = hashedTempPassword;
      await queryRunner.manager.save(user);

      // Update or create invitation record
      if (existingInvitation) {
        existingInvitation.inviteToken = newToken;
        existingInvitation.expiresAt = newExpiry;
        existingInvitation.resendCount += 1;
        existingInvitation.lastResentAt = new Date();
        existingInvitation.emailDelivered = false;
        await queryRunner.manager.save(existingInvitation);
      }

      await queryRunner.commitTransaction();

      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/set-password?token=${newToken}&uid=${user.id}`;

      // Send the email
      let emailResult: { sent: boolean; fallbackLink?: string; previewUrl?: string } = { sent: false, fallbackLink: inviteLink };
      try {
        const result = await this.emailService.sendReceptionistInvite(
          user.email,
          inviteLink,
          user.firstName,
          tempPassword
        );
        emailResult = {
          sent: result.sent,
          fallbackLink: result.fallbackLink || inviteLink,
          previewUrl: result.previewUrl,
        };

        if (result.sent && existingInvitation) {
          await this.invitationRepo.update(existingInvitation.id, { emailDelivered: true });
        }
      } catch (emailError) {
        console.error('[ReceptionistService] Failed to resend email:', emailError);
      }

      console.log('[ReceptionistService] Invite resent', { userId: user.id, email: user.email });

      return {
        invitation: existingInvitation ? { ...existingInvitation, inviteToken: undefined } : null,
        emailSent: emailResult.sent,
        inviteLink: emailResult.sent ? undefined : emailResult.fallbackLink || inviteLink,
        previewUrl: emailResult.previewUrl,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Revoke a pending invitation
   */
  async revokeInvite(dto: RevokeInviteDto, revokedById?: string): Promise<{ message: string }> {
    const queryRunner = this.userRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      const user = await queryRunner.manager.findOne(User, {
        where: { id: dto.userId, role: UserRole.RECEPTIONIST }
      });

      if (!user) {
        throw new NotFoundException('Receptionist not found');
      }

      if (!user.mustChangePassword && !user.inviteToken) {
        throw new BadRequestException('No active invitation to revoke for this user.');
      }

      // Deactivate the user and clear invitation
      user.isActive = false;
      user.inviteToken = null;
      user.inviteExpiresAt = null;
      user.mustChangePassword = false;
      await queryRunner.manager.save(user);

      // Update invitation record
      const invitation = await queryRunner.manager.findOne(ReceptionistInvitation, {
        where: { acceptedUserId: user.id, status: InviteStatus.PENDING }
      });

      if (invitation) {
        invitation.status = InviteStatus.REVOKED;
        invitation.revokedAt = new Date();
        invitation.revokeReason = dto.reason || 'Revoked by administrator';
        await queryRunner.manager.save(invitation);
      }

      await queryRunner.commitTransaction();

      console.log('[ReceptionistService] Invite revoked', { userId: user.id });

      return { message: `Invitation for ${user.firstName} ${user.lastName} has been revoked.` };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Bulk invite receptionists
   */
  async bulkInvite(dto: BulkInviteDto, invitedById?: string): Promise<{
    successful: Array<{ email: string; emailSent: boolean }>;
    failed: Array<{ email: string; reason: string }>;
    summary: { total: number; succeeded: number; failed: number };
  }> {
    const successful: Array<{ email: string; emailSent: boolean }> = [];
    const failed: Array<{ email: string; reason: string }> = [];

    for (const invite of dto.invites) {
      try {
        const result = await this.createReceptionistInvite(invite, invitedById);
        successful.push({ email: invite.email, emailSent: result.emailSent });
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ email: invite.email, reason });
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: dto.invites.length,
        succeeded: successful.length,
        failed: failed.length,
      },
    };
  }

  /**
   * List all invitations with advanced filtering, search & pagination
   */
  async listInvitations(filters: {
    status?: InviteStatus;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}): Promise<{
    invitations: ReceptionistInvitation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    stats: {
      pending: number;
      accepted: number;
      expired: number;
      revoked: number;
      totalSent: number;
    };
  }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 20));
    const skip = (page - 1) * limit;

    // Auto-expire old invitations
    await this.autoExpireInvitations();

    const qb = this.invitationRepo.createQueryBuilder('i')
      .leftJoinAndSelect('i.invitedBy', 'invitedBy')
      .leftJoinAndSelect('i.acceptedUser', 'acceptedUser');

    if (filters.status) {
      qb.andWhere('i.status = :status', { status: filters.status });
    }

    if (filters.search) {
      qb.andWhere(
        '(i.firstName ILIKE :search OR i.lastName ILIKE :search OR i.email ILIKE :search OR i.department ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';
    qb.orderBy(`i.${sortBy}`, sortOrder);

    const [invitations, total] = await qb.skip(skip).take(limit).getManyAndCount();

    // Get stats counts
    const [pending, accepted, expired, revoked, totalSent] = await Promise.all([
      this.invitationRepo.count({ where: { status: InviteStatus.PENDING } }),
      this.invitationRepo.count({ where: { status: InviteStatus.ACCEPTED } }),
      this.invitationRepo.count({ where: { status: InviteStatus.EXPIRED } }),
      this.invitationRepo.count({ where: { status: InviteStatus.REVOKED } }),
      this.invitationRepo.count(),
    ]);

    // Strip sensitive tokens
    const safeInvitations = invitations.map(inv => {
      const { inviteToken, ...safe } = inv;
      return safe as ReceptionistInvitation;
    });

    return {
      invitations: safeInvitations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: { pending, accepted, expired, revoked, totalSent },
    };
  }

  /**
   * Get invitation stats for dashboard
   */
  async getInvitationStats(): Promise<{
    pending: number;
    accepted: number;
    expired: number;
    revoked: number;
    totalSent: number;
    recentInvitations: Partial<ReceptionistInvitation>[];
    acceptanceRate: number;
    averageAcceptanceTimeHours: number;
  }> {
    await this.autoExpireInvitations();

    const [pending, accepted, expired, revoked, totalSent] = await Promise.all([
      this.invitationRepo.count({ where: { status: InviteStatus.PENDING } }),
      this.invitationRepo.count({ where: { status: InviteStatus.ACCEPTED } }),
      this.invitationRepo.count({ where: { status: InviteStatus.EXPIRED } }),
      this.invitationRepo.count({ where: { status: InviteStatus.REVOKED } }),
      this.invitationRepo.count(),
    ]);

    const recentInvitations = await this.invitationRepo.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['invitedBy'],
    });

    // Calculate acceptance rate
    const totalFinalized = accepted + expired + revoked;
    const acceptanceRate = totalFinalized > 0 ? Math.round((accepted / totalFinalized) * 100) : 0;

    // Calculate average acceptance time
    const acceptedInvites = await this.invitationRepo.find({
      where: { status: InviteStatus.ACCEPTED },
      select: ['createdAt', 'acceptedAt'],
    });

    let averageAcceptanceTimeHours = 0;
    if (acceptedInvites.length > 0) {
      const totalHours = acceptedInvites.reduce((sum, inv) => {
        if (inv.acceptedAt) {
          return sum + (inv.acceptedAt.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60);
        }
        return sum;
      }, 0);
      averageAcceptanceTimeHours = Math.round((totalHours / acceptedInvites.length) * 10) / 10;
    }

    // Strip sensitive tokens
    const safeRecent = recentInvitations.map(inv => {
      const { inviteToken, ...safe } = inv;
      return safe;
    });

    return {
      pending,
      accepted,
      expired,
      revoked,
      totalSent,
      recentInvitations: safeRecent,
      acceptanceRate,
      averageAcceptanceTimeHours,
    };
  }

  /**
   * Auto-expire old invitations
   */
  private async autoExpireInvitations(): Promise<void> {
    try {
      await this.invitationRepo
        .createQueryBuilder()
        .update(ReceptionistInvitation)
        .set({ status: InviteStatus.EXPIRED })
        .where('status = :status', { status: InviteStatus.PENDING })
        .andWhere('expiresAt < :now', { now: new Date() })
        .execute();
    } catch (err) {
      console.error('[ReceptionistService] Failed to auto-expire invitations:', err);
    }
  }

  /**
   * Set password for recruited receptionist
   */
  async setReceptionistPassword(uid: string, token: string, password: string): Promise<User> {
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    console.log('[ReceptionistService] setReceptionistPassword attempt', {
      uid,
      tokenProvided: !!token,
      tokenLength: token ? token.length : 0,
    });

    const queryRunner = this.userRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const receptionist = await queryRunner.manager.findOne(User, {
        where: { id: uid, role: UserRole.RECEPTIONIST },
        lock: { mode: 'pessimistic_write' }
      });

      if (!receptionist) {
        throw new NotFoundException('Receptionist not found');
      }

      if (receptionist.isActive && receptionist.password && !receptionist.mustChangePassword) {
        throw new BadRequestException('Receptionist already has a password set. Please use password reset instead.');
      }

      if (!receptionist.inviteToken) {
        throw new BadRequestException('No active invitation found for this receptionist');
      }

      if (receptionist.inviteToken !== token) {
        throw new BadRequestException('Invalid invite token');
      }

      if (!receptionist.inviteExpiresAt || new Date() > receptionist.inviteExpiresAt) {
        throw new BadRequestException('Invite token has expired. Please request a new invitation.');
      }

      // Hash password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update receptionist
      receptionist.password = hashedPassword;
      receptionist.isActive = true;
      receptionist.inviteToken = null;
      receptionist.inviteExpiresAt = null;
      receptionist.mustChangePassword = false;

      const savedReceptionist = await queryRunner.manager.save(receptionist);

      // Update invitation record
      const invitation = await queryRunner.manager.findOne(ReceptionistInvitation, {
        where: { acceptedUserId: uid, status: InviteStatus.PENDING }
      });

      if (invitation) {
        invitation.status = InviteStatus.ACCEPTED;
        invitation.acceptedAt = new Date();
        await queryRunner.manager.save(invitation);
      }

      await queryRunner.commitTransaction();

      console.log(`[ReceptionistService] Password set successfully for receptionist: ${receptionist.email}`);

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

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private async generateUniqueToken(queryRunner: any): Promise<string> {
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
      throw new BadRequestException('Failed to generate unique invite token. Please try again.');
    }
    return inviteToken;
  }

  private generateTempPassword(length = 10): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$";
    let pwd = "";
    for (let i = 0; i < length; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd;
  }

  // ============================================================
  // DASHBOARD & APPOINTMENTS
  // ============================================================

  async getTodayAppointments(filter?: { doctorId?: string; status?: string; search?: string }) {
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

    if (filter?.search) {
      qb.andWhere(
        '(patient.firstName ILIKE :search OR patient.lastName ILIKE :search OR doctor.firstName ILIKE :search OR doctor.lastName ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

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

  async getDashboardInsights(filter?: { doctorId?: string; status?: string; search?: string; userId?: string }) {
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

    const tasks = await this.taskRepo.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

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

  async listPayments(filters?: { status?: string; date?: string; search?: string }) {
    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .orderBy('a.appointmentDate', 'DESC')
      .addOrderBy('a.appointmentTime', 'ASC');

    if (filters?.status) {
      qb.andWhere('a.paymentStatus = :status', { status: filters.status });
    }

    if (filters?.date) {
      const date = new Date(filters.date);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      qb.andWhere('a.appointmentDate >= :date', { date })
        .andWhere('a.appointmentDate < :nextDay', { nextDay });
    }

    if (filters?.search) {
      qb.andWhere(
        '(patient.firstName ILIKE :search OR patient.lastName ILIKE :search OR doctor.firstName ILIKE :search OR doctor.lastName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const appointments = await qb.getMany();

    // Enrich with payment records (amount, method, paidAt)
    const appointmentIds = appointments.map(a => a.id);
    let paymentMap = new Map<string, Payment>();
    if (appointmentIds.length > 0) {
      const payments = await this.paymentRepo.find({
        where: { appointmentId: In(appointmentIds) },
        order: { createdAt: 'DESC' },
      });
      for (const p of payments) {
        // Keep the latest payment per appointment
        if (!paymentMap.has(p.appointmentId)) {
          paymentMap.set(p.appointmentId, p);
        }
      }
    }

    return appointments.map(a => {
      const payment = paymentMap.get(a.id);
      return {
        ...a,
        paymentAmount: payment ? Number(payment.amount) : null,
        paymentMethod: payment?.method || null,
        paymentPaidAt: payment?.paidAt || null,
        paymentTransactionId: payment?.transactionId || null,
      };
    });
  }

  async getPaymentStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's stats
    const [totalToday, paidToday, pendingToday, unpaidToday] = await Promise.all([
      this.appointmentRepo.createQueryBuilder('a')
        .where('a.appointmentDate >= :today AND a.appointmentDate < :tomorrow', { today, tomorrow })
        .getCount(),
      this.appointmentRepo.createQueryBuilder('a')
        .where('a.appointmentDate >= :today AND a.appointmentDate < :tomorrow', { today, tomorrow })
        .andWhere('a.paymentStatus = :s', { s: PaymentStatus.PAID })
        .getCount(),
      this.appointmentRepo.createQueryBuilder('a')
        .where('a.appointmentDate >= :today AND a.appointmentDate < :tomorrow', { today, tomorrow })
        .andWhere('a.paymentStatus IN (:...statuses)', { statuses: [PaymentStatus.PENDING, PaymentStatus.AWAITING_PAYMENT, PaymentStatus.PAY_AT_CLINIC] })
        .getCount(),
      this.appointmentRepo.createQueryBuilder('a')
        .where('a.appointmentDate >= :today AND a.appointmentDate < :tomorrow', { today, tomorrow })
        .andWhere('a.paymentStatus IN (:...statuses)', { statuses: [PaymentStatus.NOT_PAID, PaymentStatus.FAILED] })
        .getCount(),
    ]);

    // All-time totals
    const [totalPaid, totalPending, totalUnpaid] = await Promise.all([
      this.appointmentRepo.count({ where: { paymentStatus: PaymentStatus.PAID } }),
      this.appointmentRepo.count({
        where: [
          { paymentStatus: PaymentStatus.PENDING },
          { paymentStatus: PaymentStatus.AWAITING_PAYMENT },
          { paymentStatus: PaymentStatus.PAY_AT_CLINIC }
        ]
      }),
      this.appointmentRepo.count({
        where: [
          { paymentStatus: PaymentStatus.NOT_PAID },
          { paymentStatus: PaymentStatus.FAILED }
        ]
      }),
    ]);

    // Revenue today
    const todayPayments = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PaymentStatus.PAID })
      .andWhere('p.paidAt >= :today AND p.paidAt < :tomorrow', { today, tomorrow })
      .getMany();
    const revenueToday = todayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Total revenue
    const allPaidPayments = await this.paymentRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'total')
      .where('p.status = :status', { status: PaymentStatus.PAID })
      .getRawOne();
    const totalRevenue = Number(allPaidPayments?.total || 0);

    return {
      today: {
        total: totalToday,
        paid: paidToday,
        pending: pendingToday,
        unpaid: unpaidToday,
        revenue: revenueToday,
      },
      overall: {
        paid: totalPaid,
        pending: totalPending,
        unpaid: totalUnpaid,
        totalRevenue,
      },
    };
  }

  async listDoctorAvailability(date?: string) {
    const doctors = await this.userRepo.find({
      where: { role: UserRole.DOCTOR, isActive: true },
      order: { firstName: 'ASC' },
    });

    const targetDate = date ? new Date(date) : new Date();
    const results = [] as any[];

    for (const doc of doctors) {
      const day = await this.schedulesService.getDaySchedule(doc.id, targetDate);
      const slots = day?.slots || [];
      const shifts = day?.shifts || [];
      const totalSlots = slots.length;
      const available = slots.filter((s: any) => s.status === 'available').length;
      const booked = slots.filter((s: any) => s.status === 'booked').length;
      const blocked = slots.filter((s: any) => s.status === 'blocked').length;

      results.push({
        id: doc.id,
        name: `${doc.firstName} ${doc.lastName}`.trim(),
        specialty: doc.specialty || null,
        avatar: doc.avatar || null,
        availability: {
          date: day?.date,
          totalSlots,
          available,
          booked,
          blocked,
          slots: slots, // Return all slots instead of slice(0, 20)
          shifts: shifts, // Include shifts
        },
      });
    }

    return results;
  }

  async updateDoctorSchedule(doctorId: string, date: string, data: { shifts: any[], breaks: any[] }) {
    const doctor = await this.userRepo.findOne({ where: { id: doctorId, role: UserRole.DOCTOR } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    return this.schedulesService.updateShiftsAndBreaks(doctorId, date, data.shifts, data.breaks);
  }

  async addDoctorSlot(doctorId: string, date: string, slot: { startTime: string, endTime: string, status: string, reason?: string }) {
    const doctor = await this.userRepo.findOne({ where: { id: doctorId, role: UserRole.DOCTOR } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    return (this.schedulesService as any).setSlotStatus(
      doctorId,
      date,
      slot.startTime,
      slot.endTime,
      slot.status as any,
      slot.reason,
    );
  }

  private getDateRange(date?: string, startDate?: string, endDate?: string) {
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return { start: d, end: next };
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { start: today, end: tomorrow };
  }

  async getDailySummary(date?: string) {
    const { start, end } = this.getDateRange(date);
    const totalAppointments = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.appointmentDate >= :start AND a.appointmentDate < :end', { start, end })
      .getCount();

    const checkedIn = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.appointmentDate >= :start AND a.appointmentDate < :end', { start, end })
      .andWhere('a.arrived = :arrived', { arrived: true })
      .getCount();

    const completed = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.appointmentDate >= :start AND a.appointmentDate < :end', { start, end })
      .andWhere('a.status = :status', { status: AppointmentStatus.COMPLETED })
      .getCount();

    const cancelled = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.appointmentDate >= :start AND a.appointmentDate < :end', { start, end })
      .andWhere('a.status = :status', { status: AppointmentStatus.CANCELLED })
      .getCount();

    const noShow = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.appointmentDate >= :start AND a.appointmentDate < :end', { start, end })
      .andWhere('a.status = :status', { status: AppointmentStatus.NO_SHOW })
      .getCount();

    const payments = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PaymentStatus.PAID })
      .andWhere('p.paidAt >= :start AND p.paidAt <= :end', { start, end })
      .getMany();

    const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      date: start.toISOString().split('T')[0],
      totalAppointments,
      checkedIn,
      completed,
      cancelled,
      noShow,
      totalPayments,
    };
  }

  async getAppointmentReport(filters?: { startDate?: string; endDate?: string; doctorId?: string; status?: string }) {
    const { start, end } = this.getDateRange(undefined, filters?.startDate, filters?.endDate);
    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .where('a.appointmentDate >= :start AND a.appointmentDate <= :end', { start, end })
      .orderBy('a.appointmentDate', 'DESC')
      .addOrderBy('a.appointmentTime', 'ASC');

    if (filters?.doctorId) qb.andWhere('a.doctorId = :doctorId', { doctorId: filters.doctorId });
    if (filters?.status) qb.andWhere('a.status = :status', { status: filters.status });

    return qb.getMany();
  }

  async getPatientVisitReport(filters?: { startDate?: string; endDate?: string }) {
    const { start, end } = this.getDateRange(undefined, filters?.startDate, filters?.endDate);
    const visits = await this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .where('a.appointmentDate >= :start AND a.appointmentDate <= :end', { start, end })
      .getMany();

    const uniquePatients = new Map<string, User>();
    visits.forEach((v) => {
      if (v.patient) uniquePatients.set(v.patient.id, v.patient);
    });

    const newPatients = Array.from(uniquePatients.values()).filter((p) =>
      p.createdAt && p.createdAt >= start && p.createdAt <= end,
    ).length;

    const returningPatients = uniquePatients.size - newPatients;

    return {
      totalVisits: visits.length,
      uniquePatients: uniquePatients.size,
      newPatients,
      returningPatients,
    };
  }

  async getPaymentReport(filters?: { startDate?: string; endDate?: string; status?: string }) {
    const { start, end } = this.getDateRange(undefined, filters?.startDate, filters?.endDate);

    const paidPayments = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: PaymentStatus.PAID })
      .andWhere('p.paidAt >= :start AND p.paidAt <= :end', { start, end })
      .getMany();

    const totalCollected = paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const paidCount = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.appointmentDate >= :start AND a.appointmentDate <= :end', { start, end })
      .andWhere('a.paymentStatus = :status', { status: PaymentStatus.PAID })
      .getCount();

    const unpaidCount = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.appointmentDate >= :start AND a.appointmentDate <= :end', { start, end })
      .andWhere('a.paymentStatus = :status', { status: PaymentStatus.NOT_PAID })
      .getCount();

    const pendingCount = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.appointmentDate >= :start AND a.appointmentDate <= :end', { start, end })
      .andWhere('a.paymentStatus = :status', { status: PaymentStatus.PENDING })
      .getCount();

    return {
      totalCollected,
      paidCount,
      unpaidCount,
      pendingCount,
    };
  }

  async getDoctorActivityReport(filters?: { startDate?: string; endDate?: string }) {
    const { start, end } = this.getDateRange(undefined, filters?.startDate, filters?.endDate);
    const appointments = await this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .where('a.appointmentDate >= :start AND a.appointmentDate <= :end', { start, end })
      .getMany();

    const map = new Map<string, any>();
    for (const appt of appointments) {
      const id = appt.doctorId;
      if (!map.has(id)) {
        map.set(id, {
          doctorId: id,
          name: `${appt.doctor?.firstName || ''} ${appt.doctor?.lastName || ''}`.trim(),
          completed: 0,
          pending: 0,
          total: 0,
        });
      }
      const entry = map.get(id);
      entry.total += 1;
      if (appt.status === AppointmentStatus.COMPLETED) entry.completed += 1;
      if ([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appt.status)) entry.pending += 1;
    }

    return Array.from(map.values());
  }

  async getNoShowReport(filters?: { startDate?: string; endDate?: string }) {
    const { start, end } = this.getDateRange(undefined, filters?.startDate, filters?.endDate);
    return this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .where('a.appointmentDate >= :start AND a.appointmentDate <= :end', { start, end })
      .andWhere('a.status IN (:...statuses)', { statuses: [AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELLED] })
      .orderBy('a.appointmentDate', 'DESC')
      .addOrderBy('a.appointmentTime', 'ASC')
      .getMany();
  }

  async listReceptionistThreads(senderId: string) {
    const conversations = await this.messagesService.getConversationsForUser({ id: senderId, role: UserRole.RECEPTIONIST });

    return conversations.map(conv => {
      let receiver: User | null = null;
      let receiverRole: 'patient' | 'doctor' | 'receptionist' = 'patient';

      if (conv.patientId && conv.patientId !== senderId) {
        receiver = conv.patient;
        receiverRole = 'patient';
      } else if (conv.doctorId && conv.doctorId !== senderId) {
        receiver = conv.doctor;
        receiverRole = 'doctor';
      } else if (conv.receptionistId && conv.receptionistId !== senderId) {
        receiver = conv.receptionist;
        receiverRole = 'receptionist';
      }

      // If no valid receiver found (e.g. self chat or data issue), skip or handle gracefully
      if (!receiver) return null;

      return {
        id: conv.id, // Conversation ID
        receiverId: receiver.id,
        receiverRole: receiverRole,
        receiverName: `${receiver.firstName} ${receiver.lastName}`.trim(),
        receiverAvatar: receiver.avatar || null,
        lastMessage: conv.lastMessageContent,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.unreadCount,
      };
    }).filter(Boolean); // Filter out nulls
  }

  async getReceptionistThread(senderId: string, receiverId: string) {
    // We need to find the conversation first.
    // Since we don't know the role of receiverId immediately (unless we query User),
    // we can try to find an existing conversation where sender is receptionist and receiver is generic.
    // Or we can query the User to get the role.

    // Efficient way: check conversation repository directly or query user.
    // Let's query user to be safe and accurate.
    const receiver = await this.userRepo.findOne({ where: { id: receiverId } });
    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    const conversation = await this.messagesService.getConversationWith(
      { id: senderId, role: UserRole.RECEPTIONIST },
      receiverId,
      receiver.role as UserRole
    );

    return this.messagesService.getMessages(conversation.id, { id: senderId, role: UserRole.RECEPTIONIST });
  }

  async sendReceptionistMessage(senderId: string, dto: SendReceptionistMessageDto) {
    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    if (!sender) throw new NotFoundException('Sender not found');

    return this.messagesService.sendMessageFromUser(
      { id: senderId, role: UserRole.RECEPTIONIST },
      {
        content: dto.content,
        receiverId: dto.receiverId,
        receiverRole: dto.receiverRole,
      }
    );
  }
}
