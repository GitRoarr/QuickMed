import { join } from 'path';
import { writeFileSync } from 'fs';
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MedicalRecord, MedicalRecordType } from "./entities/medical-record.entity";
import { CreateMedicalRecordDto } from "./dto/create-medical-record.dto";
import { UsersService } from "../users/users.service";

import { CloudinaryService } from "../profile/cloudinary.service";
import * as fs from 'fs/promises';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly recordsRepository: Repository<MedicalRecord>,
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

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
      recordDate: createDto.recordDate ? new Date(createDto.recordDate) : new Date(),
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

    // Upload to Cloudinary
    const uploadRes = await this.cloudinaryService.uploadImage(file);

    // Clean up temp file
    if (file.path) {
      await fs.unlink(file.path).catch(err => console.warn('Failed to delete temp file', err));
    }

    return {
      message: 'File uploaded successfully',
      url: uploadRes.secure_url,
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

  async getStatsByDoctor(doctorId: string) {
    const records = await this.recordsRepository.find({
      where: { doctorId },
    });

    const total = records.length;
    const labCount = records.filter(r => r.type === MedicalRecordType.LAB).length;
    const imagingCount = records.filter(r => r.type === MedicalRecordType.IMAGING).length;
    const diagnosisCount = records.filter(r => r.type === MedicalRecordType.DIAGNOSIS).length;
    const prescriptionCount = records.filter(r => r.type === MedicalRecordType.PRESCRIPTION).length;
    const otherCount = records.filter(r => r.type === MedicalRecordType.OTHER).length;
    const verifiedCount = records.filter(r => r.status === 'verified').length;
    const pendingCount = records.filter(r => r.status === 'pending' || !r.status).length;

    // This week count
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekCount = records.filter(r => {
      const d = r.recordDate || r.createdAt;
      return d && new Date(d) >= weekAgo;
    }).length;

    return {
      total,
      labCount,
      imagingCount,
      diagnosisCount,
      prescriptionCount,
      otherCount,
      verifiedCount,
      pendingCount,
      thisWeekCount,
    };
  }

  async getStatsByPatient(patientId: string) {
    const records = await this.recordsRepository.find({
      where: { patientId },
    });

    // This week count
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekCount = records.filter(r => {
      const d = r.recordDate || r.createdAt;
      return d && new Date(d) >= weekAgo;
    }).length;

    return {
      total: records.length,
      labCount: records.filter(r => r.type === MedicalRecordType.LAB).length,
      imagingCount: records.filter(r => r.type === MedicalRecordType.IMAGING).length,
      diagnosisCount: records.filter(r => r.type === MedicalRecordType.DIAGNOSIS).length,
      prescriptionCount: records.filter(r => r.type === MedicalRecordType.PRESCRIPTION).length,
      otherCount: records.filter(r => r.type === MedicalRecordType.OTHER).length,
      verifiedCount: records.filter(r => r.status === 'verified').length,
      pendingCount: records.filter(r => r.status === 'pending' || !r.status).length,
      thisWeekCount,
    };
  }

  async updateStatus(id: string, status: string, doctorId: string) {
    const rec = await this.findOne(id);
    // Allow any doctor to verify/update for now, or you could restrict to assigned doctor
    // if (rec.doctorId && rec.doctorId !== doctorId) {
    //   throw new ForbiddenException('You can only update your own records');
    // }
    rec.status = status;
    // If it was unassigned, assign it to the doctor who verified it
    if (!rec.doctorId && status === 'verified') {
      rec.doctorId = doctorId;
    }
    return this.recordsRepository.save(rec);
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
