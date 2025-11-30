import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/entities/user.entity";
import { CreateDoctorDto } from "./dto/create-doctor.dto";
import { UpdateDoctorDto } from "./dto/update-doctor.dto";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { UserRole } from "../common/index";
import { EmailService } from "../common/services/email.service";

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly emailService: EmailService
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
      
      // Normalize and validate email
      const normalizedEmail = createDoctorDto.email.toLowerCase().trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Invalid email format');
      }

      // Check if email already exists (with transaction isolation)
      const existingUser = await queryRunner.manager.findOne(User, { 
        where: { email: normalizedEmail } 
      });
      if (existingUser) {
        console.log("[DoctorsService] Email already exists:", createDoctorDto.email);
        await queryRunner.rollbackTransaction();
        throw new BadRequestException("Email already exists");
      }

      // Validate required fields
      if (!createDoctorDto.firstName || !createDoctorDto.lastName || !createDoctorDto.email) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException("First name, last name, and email are required");
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

      // Create doctor user with invitation data
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

      // Update doctor: set password, activate, and clear invitation
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
    await this.usersRepository.remove(doctor);
  }
}
