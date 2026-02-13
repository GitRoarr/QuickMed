import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prescription, PrescriptionStatus } from './entities/prescription.entity';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/index';
import { Appointment } from '../appointments/entities/appointment.entity';
import { MedicalRecordsService } from '../medical-records/medical-records.service';
import { MedicalRecordType } from '../medical-records/entities/medical-record.entity';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionsRepository: Repository<Prescription>,
    private readonly medicalRecordsService: MedicalRecordsService,
  ) { }

  async create(createDto: CreatePrescriptionDto, doctorId: string): Promise<Prescription> {
    let appointment = undefined;
    if (createDto.appointmentId) {
      appointment = await this.prescriptionsRepository.manager.findOne(Appointment, {
        where: { id: createDto.appointmentId },
        relations: ['patient', 'doctor'],
      });

      if (appointment) {
        // Ensure the appointment belongs to this doctor
        if (appointment.doctorId !== doctorId) {
          throw new ForbiddenException('Cannot create prescription for another doctor\'s appointment');
        }
        // Use appointment's patient if not specified
        if (!createDto.patientId && appointment.patientId) {
          createDto.patientId = appointment.patientId;
        }
      }
    }

    const prescription = this.prescriptionsRepository.create({
      ...createDto,
      doctorId,
      appointment,
      appointmentId: createDto.appointmentId,
      prescriptionDate: createDto.prescriptionDate ? new Date(createDto.prescriptionDate) : new Date(),
      status: createDto.status || PrescriptionStatus.ACTIVE,
    });

    const saved = await this.prescriptionsRepository.save(prescription);

    // Also create a medical record for the patient
    try {
      await this.medicalRecordsService.create({
        title: `Prescription: ${saved.medication}`,
        type: MedicalRecordType.PRESCRIPTION,
        recordDate: saved.prescriptionDate ? saved.prescriptionDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        patientId: saved.patientId,
        doctorId: saved.doctorId,
        appointmentId: saved.appointmentId,
        notes: `Medication: ${saved.medication}\nDosage: ${saved.dosage}\nFrequency: ${saved.frequency}\nDuration: ${saved.duration}\n\nNotes: ${saved.notes || 'None'}`,
        status: 'verified',
      });
    } catch (error) {
      console.error('Failed to create medical record for prescription', error);
      // We don't want to fail the prescription creation if record creation fails
    }

    return saved;
  }

  async findAll(doctorId: string): Promise<Prescription[]> {
    return this.prescriptionsRepository.find({
      where: { doctorId },
      relations: ['patient', 'doctor', 'appointment'],
      order: { prescriptionDate: 'DESC' },
    });
  }

  async findByAppointment(appointmentId: string, doctorId: string): Promise<Prescription[]> {
    return this.prescriptionsRepository.find({
      where: { appointmentId, doctorId },
      relations: ['patient', 'doctor', 'appointment'],
      order: { prescriptionDate: 'DESC' },
    });
  }

  async findByPatient(patientId: string, doctorId: string): Promise<Prescription[]> {
    return this.prescriptionsRepository.find({
      where: { patientId, doctorId },
      relations: ['patient', 'doctor', 'appointment'],
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

  async getStats(doctorId: string) {
    const prescriptions = await this.prescriptionsRepository.find({
      where: { doctorId },
    });

    const total = prescriptions.length;
    const activeCount = prescriptions.filter(p => p.status === PrescriptionStatus.ACTIVE).length;
    const completedCount = prescriptions.filter(p => p.status === PrescriptionStatus.COMPLETED).length;
    const cancelledCount = prescriptions.filter(p => p.status === PrescriptionStatus.CANCELLED).length;

    // This week
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekCount = prescriptions.filter(p => {
      const d = p.prescriptionDate || (p as any).createdAt;
      return d && new Date(d) >= weekAgo;
    }).length;

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthCount = prescriptions.filter(p => {
      const d = p.prescriptionDate || (p as any).createdAt;
      return d && new Date(d) >= monthStart;
    }).length;

    return {
      total,
      activeCount,
      completedCount,
      cancelledCount,
      thisWeekCount,
      thisMonthCount,
    };
  }
}
