import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { HttpCode, HttpStatus, Query } from '@nestjs/common';
import { FeaturedTestimonial, ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createReviewDto: CreateReviewDto, @CurrentUser() user: User) {
    return this.reviewsService.create(createReviewDto, user.id);
  }

  @Get('doctor/:doctorId')
  getDoctorReviews(@Param('doctorId') doctorId: string) {
    return this.reviewsService.getDoctorReviews(doctorId);
  }

  @Get('doctor/:doctorId/rating')
  getDoctorRating(@Param('doctorId') doctorId: string) {
    return this.reviewsService.getDoctorRating(doctorId);
  }

  // Public aggregate rating for landing page (no auth needed)
  @Get('summary')
  getPlatformSummary() {
    return this.reviewsService.getPlatformSummary();
  }

  @Get('featured')
  @HttpCode(HttpStatus.OK)
  async getFeaturedTestimonials(@Query('limit') limit?: string): Promise<FeaturedTestimonial[]> {
    const parsed = limit ? Number(limit) : undefined;
    const take = parsed && !Number.isNaN(parsed) ? parsed : undefined;
    return this.reviewsService.getFeaturedTestimonials(take);
  }

  @Get('hero-metrics')
  getHeroMetrics(@Query('userId') userId?: string) {
    return this.reviewsService.getHeroMetrics(userId);
  }
}
