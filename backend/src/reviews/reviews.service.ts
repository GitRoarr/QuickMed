import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/index';

export interface FeaturedTestimonial {
  id: string;
  rating: number;
  comment: string | null;
  patientName: string;
  patientRole: string;
  createdAt: Date;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createReviewDto: CreateReviewDto, patientId: string): Promise<Review> {
    const doctor = await this.usersRepository.findOne({
      where: { id: createReviewDto.doctorId, role: UserRole.DOCTOR },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Check if patient already reviewed this doctor (optional - you might allow multiple reviews)
    const existingReview = await this.reviewsRepository.findOne({
      where: {
        doctorId: createReviewDto.doctorId,
        patientId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this doctor');
    }

    const review = this.reviewsRepository.create({
      ...createReviewDto,
      patientId,
    });

    return this.reviewsRepository.save(review);
  }

  async getDoctorReviews(doctorId: string): Promise<Review[]> {
    return this.reviewsRepository.find({
      where: { doctorId },
      relations: ['patient'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDoctorRating(doctorId: string): Promise<{ average: number; count: number }> {
    const reviews = await this.reviewsRepository.find({
      where: { doctorId },
    });

    if (reviews.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / reviews.length;

    return {
      average: parseFloat(average.toFixed(1)),
      count: reviews.length,
    };
  }

  async getAllDoctorRatings(): Promise<{ [doctorId: string]: { average: number; count: number } }> {
    const reviews = await this.reviewsRepository.find();
    const ratingsMap: { [doctorId: string]: { sum: number; count: number } } = {};

    reviews.forEach((review) => {
      if (!ratingsMap[review.doctorId]) {
        ratingsMap[review.doctorId] = { sum: 0, count: 0 };
      }
      ratingsMap[review.doctorId].sum += review.rating;
      ratingsMap[review.doctorId].count += 1;
    });

    const result: { [doctorId: string]: { average: number; count: number } } = {};
    Object.keys(ratingsMap).forEach((doctorId) => {
      const data = ratingsMap[doctorId];
      result[doctorId] = {
        average: parseFloat((data.sum / data.count).toFixed(1)),
        count: data.count,
      };
    });

    return result;
  }

  /**
   * Aggregate rating for the whole QuickMed platform.
   * Used on the public landing page stats (e.g. 4.9/5, 50,000+ happy patients).
   */
  async getPlatformSummary(): Promise<{
    average: number;
    count: number;
    happyPatients: number;
  }> {
    const reviews = await this.reviewsRepository.find({
      select: ['doctorId', 'patientId', 'rating'],
    });

    if (reviews.length === 0) {
      return { average: 0, count: 0, happyPatients: 0 };
    }

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const average = parseFloat((sum / reviews.length).toFixed(1));

    // Count distinct patients who left at least one review
    const uniquePatients = new Set<string>();
    reviews.forEach((r) => {
      if (r.patientId) {
        uniquePatients.add(r.patientId);
      }
    });

    return {
      average,
      count: reviews.length,
      happyPatients: uniquePatients.size,
    };
  }

  /** Latest testimonials for landing (sanitized) */
  async getFeaturedTestimonials(limit = 3): Promise<FeaturedTestimonial[]> {
    const take = limit && limit > 0 ? limit : 3;
    const reviews = await this.reviewsRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['patient'],
      take,
    });

    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment || '',
      patientName: r.patient ? `${r.patient.firstName} ${r.patient.lastName}`.trim() : 'Patient',
      patientRole: r.patient?.role ? r.patient.role.toLowerCase() : 'patient',
      createdAt: r.createdAt,
    }));
  }
}
