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

  async findOne(id: string) {
    const rec = await this.recordsRepository.findOne({ where: { id }, relations: ['doctor', 'patient'] });
    if (!rec) throw new NotFoundException(`Record ${id} not found`);
    return rec;
  }
}
