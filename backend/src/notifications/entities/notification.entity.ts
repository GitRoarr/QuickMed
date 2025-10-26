import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('notifications')
@Index(['userId', 'read'])
@Index(['userId', 'type'])
@Index(['userId', 'priority'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({
    type: 'enum',
    enum: ['info', 'success', 'warning', 'error', 'appointment', 'prescription', 'test_result', 'system'],
    default: 'info',
  })
  type: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  priority: string;

  @Column({ default: false })
  read: boolean;

  @Column()
  userId: string;

  @Column({ nullable: true })
  relatedEntityId?: string;

  @Column({
    type: 'enum',
    enum: ['appointment', 'prescription', 'test_result', 'user', 'system'],
    nullable: true,
  })
  relatedEntityType?: string;

  @Column({ nullable: true })
  actionUrl?: string;

  @Column({ nullable: true })
  actionText?: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

