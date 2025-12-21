import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole,} from '../common/index';
import { User } from '@/users/entities/user.entity';

import { StripeService } from './stripe.service';
import { CreateStripePaymentDto, ConfirmStripePaymentDto } from './dto/create-stripe-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly stripeService: StripeService,
  ) {}

  // Stripe Payment Endpoints
  @Post('stripe/checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async createStripeCheckout(
    @Body() dto: CreateStripePaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.stripeService.createCheckoutSession(
      dto.appointmentId,
      user.id,
      dto.email || user.email,
      dto.amount,
    );
  }

  @Post('stripe/create-intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async createStripePaymentIntent(
    @Body() dto: CreateStripePaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.stripeService.createPaymentIntent(
      dto.appointmentId,
      user.id,
      dto.email || user.email,
      dto.amount,
    );
  }

  @Post('stripe/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async confirmStripePayment(@Body() dto: ConfirmStripePaymentDto) {
    return this.stripeService.confirmPayment(dto.paymentIntentId);
  }

  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(@Req() req: any) {
    const signature = req.headers['stripe-signature'];
    // For webhooks, we need raw body. In production, use body-parser with verify option
    const payload = req.body;
    return this.stripeService.handleWebhook(signature, payload);
  }

  @Get('stripe/payment/:paymentIntentId')
  @UseGuards(JwtAuthGuard)
  async getStripePayment(@Param('paymentIntentId') paymentIntentId: string) {
    return this.stripeService.getPaymentByIntentId(paymentIntentId);
  }

  @Get('stripe/transaction/:transactionId')
  @UseGuards(JwtAuthGuard)
  async getStripeTransaction(@Param('transactionId') transactionId: string) {
    return this.stripeService.getPaymentByTransactionId(transactionId);
  }
}
