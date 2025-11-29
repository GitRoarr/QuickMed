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
  ) {}

  async getTodayAppointments(filter?: { doctorId?: string; status?: string }) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate()+1);

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
    return this.appointmentRepo.find({ where: { paymentStatus: PaymentStatus.NOT_PAID }, relations: ['patient','doctor'] });
  }

  async getWaitingPatients() {
    return this.appointmentRepo.find({ where: { status: AppointmentStatus.WAITING }, relations: ['patient','doctor'] });
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
    try {
      console.log('[ReceptionistService] Creating receptionist invite for', dto.email);
      const existingUser = await this.userRepo.findOne({ where: { email: dto.email } });
      if (existingUser) {
        console.log('[ReceptionistService] Email already exists:', dto.email);
        throw new BadRequestException('Email already exists');
      }

      const inviteToken = uuidv4();
      const inviteExpiresAt = new Date();
      inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 days expiry

      const receptionist = this.userRepo.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        role: UserRole.RECEPTIONIST,
        isActive: false,
        inviteToken,
        inviteExpiresAt,
        password: null, // No password until they accept invitation
      });

      const savedReceptionist = await this.userRepo.save(receptionist);
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/set-password?token=${inviteToken}&uid=${savedReceptionist.id}`;
      const emailResult = await this.emailService.sendReceptionistInvite(savedReceptionist.email, inviteLink);

      console.log('[ReceptionistService] Receptionist invite created', { id: savedReceptionist.id, emailSent: emailResult.sent });

      // Return without sensitive data
      const { password, inviteToken: _, inviteExpiresAt: __, ...safeReceptionist } = savedReceptionist;

      return {
        receptionist: safeReceptionist,
        emailSent: emailResult.sent,
        inviteLink: emailResult.sent ? undefined : emailResult.fallbackLink || inviteLink,
      };
    } catch (error) {
      console.error('[ReceptionistService] Failed to create receptionist invite:', error);
      throw error;
    }
  }

  async setReceptionistPassword(uid: string, token: string, password: string): Promise<User> {
    const receptionist = await this.userRepo.findOne({ where: { id: uid, role: UserRole.RECEPTIONIST } });
    if (!receptionist) throw new NotFoundException('Receptionist not found');
    if (receptionist.isActive) throw new BadRequestException('Receptionist already active');
    if (receptionist.inviteToken !== token) throw new BadRequestException('Invalid invite token');
    if (!receptionist.inviteExpiresAt || new Date() > receptionist.inviteExpiresAt) {
      throw new BadRequestException('Invite token expired');
    }

    receptionist.password = await bcrypt.hash(password, 10);
    receptionist.isActive = true;
    receptionist.inviteToken = null;
    receptionist.inviteExpiresAt = null;

    return this.userRepo.save(receptionist);
  }
}
