import { Entity, Column, CreateDateColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { NotificationPriority, NotificationType } from '@/common';

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column()
  userId: string;

  @Column({ nullable: true })
  relatedEntityId?: string;

  @Column({ nullable: true })
  relatedEntityType?: string;

  @Column({ nullable: true })
  actionUrl?: string;

  @Column({ nullable: true })
  actionText?: string;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Column({ default: false })
  read: boolean;
}