import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod } from './entities/payment.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { PaymentStatus as AppointmentPaymentStatus } from '../common/index';

@Injectable()
export class ChapaService {
  private readonly logger = new Logger(ChapaService.name);
  private readonly chapaSecretKey: string;
  private readonly chapaBaseUrl = 'https://api.chapa.co/v1';
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly appointmentsService: AppointmentsService,
  ) {
    this.chapaSecretKey = this.configService.get<string>('CHAPA_SECRET_KEY') || '';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';

    if (!this.chapaSecretKey) {
      this.logger.warn('CHAPA_SECRET_KEY is not set. Payment functionality will be limited.');
    }
  }

  async initializePayment(
    appointmentId: string,
    patientId: string,
    patientEmail?: string,
    patientPhone?: string,
    patientName?: string,
    customAmount?: number,
  ) {
    try {
      // Get appointment details
      const appointment = await this.appointmentsService.findOne(appointmentId);
      if (!appointment) {
        throw new BadRequestException('Appointment not found');
      }

      if (appointment.paymentStatus === AppointmentPaymentStatus.PAID) {
        throw new BadRequestException('Appointment is already paid');
      }

      // Calculate amount (default 500 ETB or custom)
      const amount = customAmount || 500;
      const txRef = `QM-${appointmentId}-${Date.now()}-${uuidv4().substring(0, 8)}`;

      // Create payment record
      const payment = this.paymentRepository.create({
        transactionId: txRef,
        chapaReference: txRef,
        appointmentId,
        patientId,
        amount,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.CHAPA,
        currency: 'ETB',
        description: `Payment for appointment on ${appointment.appointmentDate} at ${appointment.appointmentTime}`,
        callbackUrl: `${this.frontendUrl}/payment/callback`,
        returnUrl: `${this.frontendUrl}/payment/success?tx_ref=${txRef}`,
      });

      await this.paymentRepository.save(payment);

      // Initialize Chapa payment
      const chapaPayload = {
        amount: amount.toString(),
        currency: 'ETB',
        email: patientEmail || 'patient@example.com',
        first_name: patientName?.split(' ')[0] || 'Patient',
        last_name: patientName?.split(' ').slice(1).join(' ') || 'User',
        phone_number: patientPhone || '0912345678',
        tx_ref: txRef,
        callback_url: `${this.configService.get('API_URL') || 'http://localhost:3000'}/payments/chapa/callback`,
        return_url: `${this.frontendUrl}/payment/success?tx_ref=${txRef}`,
        customization: {
          title: 'QuickMed Appointment Payment',
          description: `Payment for appointment scheduled on ${appointment.appointmentDate}`,
        },
      };

      const chapaResponse = await axios.post(
        `${this.chapaBaseUrl}/transaction/initialize`,
        chapaPayload,
        {
          headers: {
            Authorization: `Bearer ${this.chapaSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Update payment with Chapa response
      payment.chapaResponse = chapaResponse.data;
      if (chapaResponse.data?.data?.checkout_url) {
        payment.returnUrl = chapaResponse.data.data.checkout_url;
      }

      await this.paymentRepository.save(payment);

      this.logger.log(`Payment initialized: ${txRef} for appointment ${appointmentId}`);

      return {
        transactionId: txRef,
        checkoutUrl: chapaResponse.data?.data?.checkout_url,
        status: 'pending',
        amount,
        currency: 'ETB',
        message: 'Payment initialized successfully',
      };
    } catch (error) {
      this.logger.error('Error initializing payment:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new BadRequestException('Invalid Chapa API credentials');
      }
      
      throw new InternalServerErrorException(
        error.response?.data?.message || 'Failed to initialize payment',
      );
    }
  }

  async verifyPayment(transactionId: string) {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { transactionId },
        relations: ['appointment', 'patient'],
      });

      if (!payment) {
        throw new BadRequestException('Payment transaction not found');
      }

      if (payment.status === PaymentStatus.SUCCESS) {
        return {
          success: true,
          payment,
          message: 'Payment already verified',
        };
      }

      // Verify with Chapa
      const verifyResponse = await axios.get(
        `${this.chapaBaseUrl}/transaction/verify/${payment.chapaReference}`,
        {
          headers: {
            Authorization: `Bearer ${this.chapaSecretKey}`,
          },
        },
      );

      const chapaData = verifyResponse.data?.data;

      if (chapaData?.status === 'success' && chapaData?.amount === payment.amount) {
        // Payment successful
        payment.status = PaymentStatus.SUCCESS;
        payment.paidAt = new Date();
        payment.chapaResponse = verifyResponse.data;

        // Update appointment payment status
        await this.appointmentsService.update(payment.appointmentId, {
          paymentStatus: AppointmentPaymentStatus.PAID,
        } as any, payment.patient as any);

        await this.paymentRepository.save(payment);

        this.logger.log(`Payment verified successfully: ${transactionId}`);

        return {
          success: true,
          payment,
          message: 'Payment verified successfully',
        };
      } else {
        // Payment failed
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = chapaData?.message || 'Payment verification failed';
        payment.chapaResponse = verifyResponse.data;
        await this.paymentRepository.save(payment);

        return {
          success: false,
          payment,
          message: payment.failureReason,
        };
      }
    } catch (error) {
      this.logger.error('Error verifying payment:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  async handleChapaCallback(data: any) {
    try {
      const txRef = data.tx_ref;
      if (!txRef) {
        throw new BadRequestException('Missing transaction reference');
      }

      const payment = await this.paymentRepository.findOne({
        where: { chapaReference: txRef },
        relations: ['appointment'],
      });

      if (!payment) {
        this.logger.warn(`Payment not found for tx_ref: ${txRef}`);
        return { success: false, message: 'Payment not found' };
      }

      // Verify the payment
      return await this.verifyPayment(payment.transactionId);
    } catch (error) {
      this.logger.error('Error handling Chapa callback:', error);
      return { success: false, message: error.message };
    }
  }

  async getPaymentByTransactionId(transactionId: string) {
    return this.paymentRepository.findOne({
      where: { transactionId },
      relations: ['appointment', 'patient'],
    });
  }

  async getPaymentsByAppointment(appointmentId: string) {
    return this.paymentRepository.find({
      where: { appointmentId },
      relations: ['patient'],
      order: { createdAt: 'DESC' },
    });
  }
}
