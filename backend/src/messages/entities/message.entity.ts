import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';

export enum MessageSenderType {
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}

@Entity('messages')
export class Message extends BaseEntity {
  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  conversationId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column()
  senderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @Column()
  receiverId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageSenderType,
  })
  senderType: MessageSenderType;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;
}
