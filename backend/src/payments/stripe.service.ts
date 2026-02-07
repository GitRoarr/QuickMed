import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Payment, PaymentStatus, PaymentMethod } from './entities/payment.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { Appointment } from '../appointments/entities/appointment.entity';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe | null = null;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Appointment)
    private appointmentsRepository: Repository<Appointment>,
    private appointmentsService: AppointmentsService,
  ) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not set. Stripe card payments will be disabled until this is configured.',
      );
      return;
    }

    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-11-17.clover',
    });
  }

  async createPaymentIntent(
    appointmentId: string,
    patientId: string,
    email: string,
    amount?: number,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured on the server.');
    }
    const appointment = await this.appointmentsService.findOne(appointmentId);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const paymentAmount = amount || 50;
    if (paymentAmount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    const amountInCents = Math.round(paymentAmount * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        appointmentId,
        patientId,
        email,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    await this.appointmentsRepository.update(appointmentId, {
      status: 'pending_payment',
      paymentStatus: 'pending',
      paymentDueAt: appointment.paymentDueAt || new Date(Date.now() + 10 * 60 * 1000),
    } as any);

    const payment = this.paymentRepository.create({
      transactionId: paymentIntent.id,
      appointmentId,
      patientId,
      amount: paymentAmount,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.CARD,
      currency: 'USD',
      description: `Payment for appointment ${appointmentId}`,
      stripePaymentIntentId: paymentIntent.id,
    });

    await this.paymentRepository.save(payment);

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  async confirmPayment(paymentIntentId: string): Promise<Payment> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured on the server.');
    }
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (paymentIntent.status === 'succeeded') {
      payment.status = PaymentStatus.PAID;
      payment.paidAt = new Date();
      payment.stripeResponse = paymentIntent as any;

      await this.appointmentsRepository.update(payment.appointmentId, {
        paymentStatus: 'paid',
        status: 'confirmed',
      });
    } else if (paymentIntent.status === 'canceled') {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = 'Payment was canceled';
      await this.appointmentsRepository.update(payment.appointmentId, {
        paymentStatus: 'not_paid',
        status: 'pending_payment',
      } as any);
    } else if (paymentIntent.status === 'requires_payment_method') {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = 'Payment method required';
      await this.appointmentsRepository.update(payment.appointmentId, {
        paymentStatus: 'not_paid',
        status: 'pending_payment',
      } as any);
    } else {
      payment.status = PaymentStatus.PENDING;
    }

    await this.paymentRepository.save(payment);
    return payment;
  }

  async handleWebhook(signature: string, payload: string | Buffer): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured on the server.');
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload) : payload;
      event = this.stripe.webhooks.constructEvent(
        payloadBuffer,
        signature,
        webhookSecret || '',
      );
    } catch (err: any) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.confirmPayment(paymentIntent.id);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        const payment = await this.paymentRepository.findOne({
          where: { stripePaymentIntentId: failedPayment.id },
        });
        if (payment) {
          payment.status = PaymentStatus.FAILED;
          payment.failureReason = 'Payment failed';
          await this.paymentRepository.save(payment);
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

  async getPaymentByIntentId(paymentIntentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
      relations: ['appointment', 'patient'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getPaymentByTransactionId(txId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: [{ transactionId: txId }, { stripePaymentIntentId: txId }],
      relations: ['appointment', 'patient'],
    });
  }
}
