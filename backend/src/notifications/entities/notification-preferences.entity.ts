import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('notification_preferences')
@Index(['userId'], { unique: true })
export class NotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ default: true })
  pushNotifications: boolean;

  @Column({ default: false })
  smsNotifications: boolean;

  @Column({ default: true })
  appointmentReminders: boolean;

  @Column({ default: true })
  prescriptionAlerts: boolean;

  @Column({ default: true })
  testResultAlerts: boolean;

  @Column({ default: true })
  systemUpdates: boolean;

  @Column({ default: false })
  marketingEmails: boolean;

  @Column({ default: 30 })
  reminderTime: number; // minutes before appointment

  @Column({ default: '22:00' })
  quietHoursStart: string; // HH:mm format

  @Column({ default: '08:00' })
  quietHoursEnd: string; // HH:mm format

  @Column({ default: 'UTC' })
  timezone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

