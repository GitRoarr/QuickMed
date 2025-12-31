import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Consultation } from './entities/consultation.entity';
import { StartConsultationDto } from './dto/start-consultation.dto';
import { RateConsultationDto } from './dto/rate-consultation.dto';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectRepository(Consultation)
    private readonly repo: Repository<Consultation>,
  ) {}

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
