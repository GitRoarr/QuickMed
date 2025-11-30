import { Injectable, NotFoundException } from "@nestjs/common";
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

    const record = this.recordsRepository.create({
      title: createDto.title,
      type: createDto.type ?? MedicalRecordType.OTHER,
      recordDate: createDto.recordDate ? new Date(createDto.recordDate) : undefined,
      patient,
      doctor,
      fileUrl: createDto.fileUrl,
      notes: createDto.notes,
    });

    const saved = await this.recordsRepository.save(record);

    // update patient count if exists
    try {
      this.usersService.update(patient.id, { medicalRecordsCount: (patient as any).medicalRecordsCount ? (patient as any).medicalRecordsCount + 1 : 1 });
    } catch (e) {
      // ignore update failures
    }

    return saved;
  }

  async findByPatient(patientId: string) {
    return this.recordsRepository.find({ where: { patient: { id: patientId } }, relations: ['doctor', 'patient'] });
  }

  async findByDoctor(doctorId: string, search?: string) {
    const queryBuilder = this.recordsRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.patient', 'patient')
      .leftJoinAndSelect('record.doctor', 'doctor')
      .where('record.doctor.id = :doctorId', { doctorId })
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
    if (rec.doctor?.id !== doctorId) {
      throw new NotFoundException('Record not found or access denied');
    }
    await this.recordsRepository.remove(rec);
  }
}
