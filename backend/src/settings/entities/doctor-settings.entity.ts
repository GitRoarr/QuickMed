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

  @Column({ nullable: true })
  officeAddress: string;

  @Column({ nullable: true })
  officePhone: string;

  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  smsNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  appointmentReminders: boolean;

  @Column({ type: 'boolean', default: true })
  messageNotifications: boolean;

  @Column({ type: 'simple-array', nullable: true })
  availableDays: string[];
  @Column({ nullable: true })
  startTime: string; // e.g., "09:00"

  @Column({ nullable: true })
  endTime: string; // e.g., "17:00"

  @Column({ type: 'int', nullable: true })
  appointmentDuration: number; // in minutes

  // Active Period Settings
  @Column({ type: 'date', nullable: true })
  validFrom: Date; // start date of availability period

  @Column({ type: 'date', nullable: true })
  validTo: Date; // end date of availability period

  // Buffer Time Settings
  @Column({ type: 'int', default: 0 })
  bufferMinutes: number; // buffer time between appointments

  // Default Template Reference
  @Column({ nullable: true })
  defaultTemplateId: string; // reference to default availability template

  // Break Configuration Reference
  @Column({ nullable: true })
  breakConfigId: string; // reference to break configuration

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  consultationFee: number;

  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ type: 'boolean', default: true })
  twoFactorAuth: boolean;

  @Column({ type: 'boolean', default: true })
  shareDataWithPatients: boolean;
}
