import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, Between } from 'typeorm';
import { Consultation } from './entities/consultation.entity';
import { Treatment } from './entities/treatment.entity';
import { StartConsultationDto } from './dto/start-consultation.dto';
import { RateConsultationDto } from './dto/rate-consultation.dto';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { Appointment } from '../appointments/entities/appointment.entity';
import { UserRole } from '../common/index';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectRepository(Consultation)
    private readonly repo: Repository<Consultation>,
    @InjectRepository(Treatment)
    private readonly treatmentRepo: Repository<Treatment>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
  ) {}

  async create(dto: CreateConsultationDto, doctorId: string) {
    // Get the appointment to find patientId
    const appointment = await this.appointmentRepo.findOne({
      where: { id: dto.appointmentId },
      relations: ['patient', 'doctor'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if consultation already exists for this appointment
    const existing = await this.repo.findOne({
      where: { appointmentId: dto.appointmentId },
    });

    if (existing) {
      // Update existing consultation
      existing.notes = dto.notes;
      const savedConsultation = await this.repo.save(existing);

      // Remove old treatments and add new ones
      await this.treatmentRepo.delete({ consultationId: existing.id });

      if (dto.treatments && dto.treatments.length > 0) {
        const treatments = dto.treatments.map((t) =>
          this.treatmentRepo.create({
            ...t,
            consultationId: savedConsultation.id,
          }),
        );
        await this.treatmentRepo.save(treatments);
      }

      return this.findOne(savedConsultation.id);
    }

    // Create new consultation
    const consultation = this.repo.create({
      appointmentId: dto.appointmentId,
      doctorId,
      patientId: appointment.patientId,
      notes: dto.notes,
      startTime: new Date(),
      endTime: new Date(),
      durationMin: 0,
    });

    const savedConsultation = await this.repo.save(consultation);

    // Create treatments
    if (dto.treatments && dto.treatments.length > 0) {
      const treatments = dto.treatments.map((t) =>
        this.treatmentRepo.create({
          ...t,
          consultationId: savedConsultation.id,
        }),
      );
      await this.treatmentRepo.save(treatments);
    }

    // Update appointment status to completed
    appointment.status = 'completed' as any;
    await this.appointmentRepo.save(appointment);

    return this.findOne(savedConsultation.id);
  }

  async update(id: string, dto: Partial<CreateConsultationDto>, doctorId: string) {
    const consultation = await this.repo.findOne({ where: { id } });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    if (consultation.doctorId !== doctorId) {
      throw new ForbiddenException('You can only update your own consultations');
    }

    if (dto.notes) {
      consultation.notes = dto.notes;
    }

    await this.repo.save(consultation);

    // Update treatments if provided
    if (dto.treatments) {
      await this.treatmentRepo.delete({ consultationId: id });
      const treatments = dto.treatments.map((t) =>
        this.treatmentRepo.create({
          ...t,
          consultationId: id,
        }),
      );
      await this.treatmentRepo.save(treatments);
    }

    return this.findOne(id);
  }

  async findOne(id: string) {
    const consultation = await this.repo.findOne({
      where: { id },
      relations: ['treatments', 'appointment', 'doctor', 'patient'],
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    return consultation;
  }

  async findByUser(userId: string, role: string) {
    const where = role === UserRole.DOCTOR ? { doctorId: userId } : { patientId: userId };

    return this.repo.find({
      where,
      relations: ['treatments', 'appointment', 'doctor', 'patient'],
      order: { createdAt: 'DESC' },
    });
  }

  async start(dto: StartConsultationDto) {
    const entity = this.repo.create({
      appointmentId: dto.appointmentId ?? null,
      doctorId: dto.doctorId,
      patientId: dto.patientId,
      startTime: new Date(),
      endTime: null,
      durationMin: null,
      rating: null,
      comment: null,
    });
    return this.repo.save(entity);
  }

  async end(id: string) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Consultation not found');
    if (!c.endTime) {
      c.endTime = new Date();
      const minutes = Math.max(
        0,
        Math.round((c.endTime.getTime() - c.startTime.getTime()) / 60000),
      );
      c.durationMin = minutes;
      await this.repo.save(c);
    }
    return c;
  }

  async rate(id: string, dto: RateConsultationDto) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Consultation not found');
    c.rating = dto.rating;
    c.comment = dto.comment ?? null;
    return this.repo.save(c);
  }

  async findByAppointmentId(appointmentId: string): Promise<Consultation | null> {
    const consultation = await this.repo.findOne({
      where: { appointmentId },
      relations: ['treatments', 'appointment', 'doctor', 'patient'],
    });

    return consultation ?? null;
  }

  async stats(start?: string, end?: string) {
    const where: any = {};
    if (start || end) {
      const s = start ? new Date(start) : new Date('1970-01-01');
      const e = end ? new Date(end) : new Date();
      where.startTime = Between(s, e);
    }
    const list = await this.repo.find({ where });
    const completed = list.filter((c) => c.durationMin != null);
    const rated = list.filter((c) => typeof c.rating === 'number');

    const avgDuration = completed.length
      ? Math.round(
          completed.reduce((sum, c) => sum + (c.durationMin ?? 0), 0) /
            completed.length,
        )
      : 0;

    const avgRating = rated.length
      ? Number(
          (
            rated.reduce((sum, c) => sum + (c.rating ?? 0), 0) / rated.length
          ).toFixed(2),
        )
      : 0;

    return {
      averageConsultationMinutes: avgDuration,
      satisfactionRate: avgRating,
      reviewsCount: rated.length,
      sampleSize: list.length,
      period: {
        start: start ?? null,
        end: end ?? null,
      },
    };
  }
}
