import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'doctorId' })
  doctor: User;

  @Column({ nullable: true })
  doctorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column({ nullable: true })
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'receptionistId' })
  receptionist: User;

  @Column({ nullable: true })
  receptionistId: string;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @Column({ type: 'int', default: 0 })
  unreadCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ type: 'text', nullable: true })
  lastMessageContent: string;
}
