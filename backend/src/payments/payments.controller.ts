import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
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

import { ChapaService } from './chapa.service';
import { StripeService } from './stripe.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CreateStripePaymentDto, ConfirmStripePaymentDto } from './dto/create-stripe-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly chapaService: ChapaService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  async initializePayment(
    @Body() dto: InitializePaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.chapaService.initializePayment(
      dto.appointmentId,
      user.id,
      dto.email || user.email,
      dto.phoneNumber || user.phoneNumber,
      dto.firstName && dto.lastName ? `${dto.firstName} ${dto.lastName}` : `${user.firstName} ${user.lastName}`,
      dto.amount,
    );
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.chapaService.verifyPayment(dto.transactionId);
  }

  @Get('verify/:transactionId')
  @HttpCode(HttpStatus.OK)
  async verifyPaymentGet(@Param('transactionId') transactionId: string) {
    return this.chapaService.verifyPayment(transactionId);
  }

  @Post('chapa/callback')
  @HttpCode(HttpStatus.OK)
  async handleChapaCallback(@Body() data: any, @Req() req: any) {
    // Chapa webhook callback
    return this.chapaService.handleChapaCallback(data);
  }

  @Get('transaction/:transactionId')
  @UseGuards(JwtAuthGuard)
  async getPaymentDetails(@Param('transactionId') transactionId: string) {
    return this.chapaService.getPaymentByTransactionId(transactionId);
  }

  @Get('appointment/:appointmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  async getAppointmentPayments(@Param('appointmentId') appointmentId: string) {
    return this.chapaService.getPaymentsByAppointment(appointmentId);
  }

  // Stripe Payment Endpoints
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
}
