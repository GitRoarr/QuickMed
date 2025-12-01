import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

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
}
