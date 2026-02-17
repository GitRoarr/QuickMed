import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { UserRole } from '../common/index';
import { DoctorSettings } from '../settings/entities/doctor-settings.entity';

@Injectable()
export class CashService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(Appointment)
    private readonly appointmentsRepo: Repository<Appointment>,
    @InjectRepository(DoctorSettings)
    private readonly doctorSettingsRepo: Repository<DoctorSettings>,
  ) { }

  async recordCashPayment(
    appointmentId: string,
    patientId: string,
    amount?: number,
    currency: string = 'USD',
    note?: string,
    role: UserRole = UserRole.RECEPTIONIST,
  ): Promise<Payment> {
    const appointment = await this.appointmentsRepo.findOne({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (appointment.paymentStatus === 'paid') {
      throw new BadRequestException('Appointment is already paid');
    }

    const effectivePatientId = patientId || appointment.patientId;
    if (!effectivePatientId) throw new BadRequestException('Patient ID is required');

    let paymentAmount = amount;
    if (!paymentAmount || paymentAmount <= 0) {
      const doctorSettings = await this.doctorSettingsRepo.findOne({ where: { doctorId: appointment.doctorId } });
      paymentAmount = doctorSettings?.consultationFee ? Number(doctorSettings.consultationFee) : 50;
    }

    const isPatientInitiated = role === UserRole.PATIENT;

    // If patient initiates "Pay at Clinic", status depends on policy.
    // Usually it means PENDING payment.
    // If receptionist/admin initiates it, it means cash RECEIVED -> PAID.
    const paymentStatus = isPatientInitiated ? PaymentStatus.PENDING : PaymentStatus.PAID;
    const paidAt = isPatientInitiated ? null : new Date();

    const payment = this.paymentsRepo.create({
      transactionId: `CASH-${appointmentId}-${Date.now()}`,
      appointmentId,
      patientId: effectivePatientId,
      amount: paymentAmount,
      status: paymentStatus,
      method: PaymentMethod.CASH,
      currency,
      description: note || (isPatientInitiated ? 'Patient chose to pay at clinic' : `Cash payment for appointment ${appointmentId}`),
      paidAt: paidAt as any,
    });

    await this.paymentsRepo.save(payment);

    // Update appointment status
    // If patient: keep appointment PENDING (waiting for doctor/admin confirmation or payment at clinic)
    // If receptionist: CONFIRM appointment explicitly
    if (!isPatientInitiated) {
      await this.appointmentsRepo.update(appointmentId, {
        paymentStatus: 'paid',
        status: 'confirmed'
      } as any);
    } else {
      await this.appointmentsRepo.update(appointmentId, {
        paymentStatus: 'pay_at_clinic'
      } as any);
    }

    return payment;
  }
}
