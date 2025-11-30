import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('doctor_settings')
export class DoctorSettings extends BaseEntity {
  @OneToOne(() => User)
  @JoinColumn({ name: 'doctorId' })
  doctor: User;

  @Column({ unique: true })
  doctorId: string;

  // Profile Settings
  @Column({ nullable: true })
  officeAddress: string;

  @Column({ nullable: true })
  officePhone: string;

  // Notification Settings
  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  smsNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  appointmentReminders: boolean;

  @Column({ type: 'boolean', default: true })
  messageNotifications: boolean;

  // Availability Settings
  @Column({ type: 'simple-array', nullable: true })
  availableDays: string[]; // ['Monday', 'Tuesday', etc.]

  @Column({ nullable: true })
  startTime: string; // e.g., "09:00"

  @Column({ nullable: true })
  endTime: string; // e.g., "17:00"

  @Column({ type: 'int', nullable: true })
  appointmentDuration: number; // in minutes

  // Billing Settings
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  consultationFee: number;

  @Column({ nullable: true })
  paymentMethod: string;

  // Privacy & Security
  @Column({ type: 'boolean', default: true })
  twoFactorAuth: boolean;

  @Column({ type: 'boolean', default: true })
  shareDataWithPatients: boolean;
}
