import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { User } from '../../users/entities/user.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

export enum PaymentMethod {
  STRIPE = 'stripe',
  CASH = 'cash',
  CARD = 'card',
}

@Entity('payments')
export class Payment extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  transactionId: string; // Payment reference (intent or checkout session)

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripePaymentIntentId: string; // Stripe Payment Intent ID

  @ManyToOne(() => Appointment)
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @Column()
  appointmentId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column()
  patientId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.STRIPE,
  })
  method: PaymentMethod;

  @Column({ type: 'varchar', length: 255, nullable: true })
  currency: string; // ETB or USD

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  stripeResponse: any; // Store Stripe's full response

  @Column({ type: 'varchar', length: 255, nullable: true })
  callbackUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  returnUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'text', nullable: true })
  failureReason: string;
}
