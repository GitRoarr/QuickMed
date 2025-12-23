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

  async createCheckoutSession(
    appointmentId: string,
    patientId: string,
    email: string,
    amount?: number,
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Appointment ${appointmentId}`,
              description: `Payment for appointment ${appointmentId}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}&appointmentId=${appointmentId}`,
      cancel_url: `${frontendUrl}/payments/cancel?appointmentId=${appointmentId}`,
      metadata: {
        appointmentId,
        patientId,
        email,
      },
    });

    const payment = this.paymentRepository.create({
      transactionId: session.id,
      appointmentId,
      patientId,
      amount: paymentAmount,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.STRIPE,
      currency: 'USD',
      description: `Payment for appointment ${appointmentId}`,
      stripeResponse: session as any,
      returnUrl: `${frontendUrl}/payments/success`,
      callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/payments/stripe/webhook`,
    });

    await this.paymentRepository.save(payment);

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
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
      payment.status = PaymentStatus.SUCCESS;
      payment.paidAt = new Date();
      payment.stripeResponse = paymentIntent as any;

      await this.appointmentsRepository.update(payment.appointmentId, {
        paymentStatus: 'paid',
      });
    } else if (paymentIntent.status === 'canceled') {
      payment.status = PaymentStatus.CANCELLED;
      payment.failureReason = 'Payment was canceled';
    } else if (paymentIntent.status === 'requires_payment_method') {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = 'Payment method required';
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
