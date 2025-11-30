import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prescription, PrescriptionStatus } from './entities/prescription.entity';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/index';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionsRepository: Repository<Prescription>,
  ) {}

  async create(createDto: CreatePrescriptionDto, doctorId: string): Promise<Prescription> {
    const prescription = this.prescriptionsRepository.create({
      ...createDto,
      doctorId,
      prescriptionDate: createDto.prescriptionDate ? new Date(createDto.prescriptionDate) : new Date(),
      status: createDto.status || PrescriptionStatus.ACTIVE,
    });

    return this.prescriptionsRepository.save(prescription);
  }

  async findAll(doctorId: string): Promise<Prescription[]> {
    return this.prescriptionsRepository.find({
      where: { doctorId },
      relations: ['patient', 'doctor'],
      order: { prescriptionDate: 'DESC' },
    });
  }

  async findOne(id: string, doctorId: string): Promise<Prescription> {
    const prescription = await this.prescriptionsRepository.findOne({
      where: { id },
      relations: ['patient', 'doctor'],
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    if (prescription.doctorId !== doctorId) {
      throw new ForbiddenException('You can only access your own prescriptions');
    }

    return prescription;
  }

  async search(doctorId: string, query: string): Promise<Prescription[]> {
    return this.prescriptionsRepository
      .createQueryBuilder('prescription')
      .leftJoinAndSelect('prescription.patient', 'patient')
      .leftJoinAndSelect('prescription.doctor', 'doctor')
      .where('prescription.doctorId = :doctorId', { doctorId })
      .andWhere(
        '(LOWER(prescription.medication) LIKE LOWER(:query) OR LOWER(patient.firstName) LIKE LOWER(:query) OR LOWER(patient.lastName) LIKE LOWER(:query))',
        { query: `%${query}%` },
      )
      .orderBy('prescription.prescriptionDate', 'DESC')
      .getMany();
  }

  async updateStatus(id: string, status: PrescriptionStatus, doctorId: string): Promise<Prescription> {
    const prescription = await this.findOne(id, doctorId);
    prescription.status = status;
    return this.prescriptionsRepository.save(prescription);
  }

  async delete(id: string, doctorId: string): Promise<void> {
    const prescription = await this.findOne(id, doctorId);
    await this.prescriptionsRepository.remove(prescription);
  }
}
