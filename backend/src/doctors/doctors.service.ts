import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '../common/index';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly emailService: EmailService
  ) {}

  async createDoctorInvite(createDoctorDto: CreateDoctorDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({ where: { email: createDoctorDto.email } });
    if (existingUser) throw new BadRequestException("Email already exists");

    const inviteToken = uuidv4();
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7);

    const doctor = this.usersRepository.create({
      ...createDoctorDto,
      role: UserRole.DOCTOR,
      isActive: false,
      inviteToken,
      inviteExpiresAt,
      licenseValidated: false,
      employmentConfirmed: false,
    });

    const savedDoctor = await this.usersRepository.save(doctor);
    const inviteLink = `${process.env.FRONTEND_URL}/set-password?token=${inviteToken}&uid=${savedDoctor.id}`;
    await this.emailService.sendDoctorInvite(savedDoctor.email, inviteLink);
    return savedDoctor;
  }

  async setDoctorPassword(uid: string, token: string, password: string): Promise<User> {
    const doctor = await this.usersRepository.findOne({ where: { id: uid, role: UserRole.DOCTOR } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    if (doctor.isActive) throw new BadRequestException('Doctor already active');
    if (doctor.inviteToken !== token) throw new BadRequestException('Invalid invite token');
    if (new Date() > doctor.inviteExpiresAt) throw new BadRequestException('Invite token expired');

    doctor.password = await bcrypt.hash(password, 10);
    doctor.isActive = true;
    doctor.inviteToken = null;
    doctor.inviteExpiresAt = null;

    return this.usersRepository.save(doctor);
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
