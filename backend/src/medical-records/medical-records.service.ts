import { join } from 'path';
import { writeFileSync } from 'fs';
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MedicalRecord, MedicalRecordType } from "./entities/medical-record.entity";
import { CreateMedicalRecordDto } from "./dto/create-medical-record.dto";
import { UsersService } from "../users/users.service";

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly recordsRepository: Repository<MedicalRecord>,
    private readonly usersService: UsersService
  ) {}

  async create(createDto: CreateMedicalRecordDto) {
    const patient = await this.usersService.findOne(createDto.patientId);

    let doctor = undefined;
    if (createDto.doctorId) {
      doctor = await this.usersService.findOne(createDto.doctorId);
    }

    let appointment = undefined;
    if (createDto.appointmentId) {
      const { Appointment } = await import('../appointments/entities/appointment.entity');
      appointment = await this.recordsRepository.manager.findOne(Appointment, {
        where: { id: createDto.appointmentId },
      });
    }

    const record = this.recordsRepository.create({
      title: createDto.title,
      type: createDto.type ?? MedicalRecordType.OTHER,
      recordDate: createDto.recordDate ? new Date(createDto.recordDate) : undefined,
      patient,
      patientId: createDto.patientId,
      doctor,
      doctorId: createDto.doctorId,
      appointment,
      appointmentId: createDto.appointmentId,
      fileUrl: createDto.fileUrl,
      notes: createDto.notes,
      description: createDto.description,
      fileSize: createDto.fileSize,
      status: createDto.status || 'pending',
    });

    const saved = await this.recordsRepository.save(record);

    return saved;
  }

  async saveRecordFile(file: Express.Multer.File, patientId: string, doctorId?: string) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('File too large (max 10MB)');
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only PDF, PNG, JPEG allowed.');
    }

    const uploadPath = join(__dirname, '../../uploads', file.originalname);
    writeFileSync(uploadPath, file.buffer);

    const createDto: any = {
      patientId,
      doctorId,
      title: file.originalname,
      fileUrl: `/uploads/${file.originalname}`,
      fileSize: file.size,
      type: 'FILE',
    };
    const record = await this.create(createDto);
    return {
      message: 'File uploaded successfully',
      record,
      url: createDto.fileUrl,
    };
  }

  async findByPatient(patientId: string) {
    return this.recordsRepository.find({
      where: { patient: { id: patientId } },
      relations: ['doctor', 'patient', 'appointment'],
      order: { recordDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findByAppointment(appointmentId: string) {
    return this.recordsRepository.find({
      where: { appointmentId },
      relations: ['doctor', 'patient', 'appointment'],
    });
  }

  async findByDoctor(doctorId: string, search?: string) {
    const queryBuilder = this.recordsRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.patient', 'patient')
      .leftJoinAndSelect('record.doctor', 'doctor')
      .where('record.doctorId = :doctorId', { doctorId })
      .orderBy('record.recordDate', 'DESC');

    if (search) {
      queryBuilder.andWhere(
        '(LOWER(record.title) LIKE LOWER(:search) OR LOWER(record.type) LIKE LOWER(:search) OR LOWER(patient.firstName) LIKE LOWER(:search) OR LOWER(patient.lastName) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string) {
    const rec = await this.recordsRepository.findOne({ where: { id }, relations: ['doctor', 'patient'] });
    if (!rec) throw new NotFoundException(`Record ${id} not found`);
    return rec;
  }

  async delete(id: string, doctorId: string) {
    const rec = await this.findOne(id);
    if (rec.doctorId !== doctorId) {
      throw new NotFoundException('Record not found or access denied');
    }
    await this.recordsRepository.remove(rec);
    return { deleted: true };
  }
}
