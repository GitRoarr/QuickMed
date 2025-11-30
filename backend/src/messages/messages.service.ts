import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageSenderType } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/index';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
  ) {}

  async getOrCreateConversation(doctorId: string, patientId: string): Promise<Conversation> {
    let conversation = await this.conversationsRepository.findOne({
      where: { doctorId, patientId },
      relations: ['doctor', 'patient'],
    });

    if (!conversation) {
      conversation = this.conversationsRepository.create({
        doctorId,
        patientId,
        unreadCount: 0,
      });
      conversation = await this.conversationsRepository.save(conversation);
    }

    return conversation;
  }

  async getConversations(doctorId: string): Promise<Conversation[]> {
    const conversations = await this.conversationsRepository.find({
      where: { doctorId },
      relations: ['patient', 'doctor'],
      order: { lastMessageAt: 'DESC' },
    });

    // Calculate unread count for each conversation
    for (const conv of conversations) {
      const unread = await this.messagesRepository.count({
        where: {
          conversationId: conv.id,
          receiverId: doctorId,
          isRead: false,
        },
      });
      conv.unreadCount = unread;
    }

    return conversations;
  }

  async getMessages(conversationId: string, doctorId: string): Promise<Message[]> {
    const conversation = await this.conversationsRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.doctorId !== doctorId) {
      throw new ForbiddenException('You can only access your own conversations');
    }

    const messages = await this.messagesRepository.find({
      where: { conversationId },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'ASC' },
    });

    // Mark messages as read
    await this.messagesRepository.update(
      {
        conversationId,
        receiverId: doctorId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    // Update conversation unread count
    conversation.unreadCount = 0;
    await this.conversationsRepository.save(conversation);

    return messages;
  }

  async sendMessage(
    doctorId: string,
    patientId: string,
    content: string,
  ): Promise<Message> {
    const conversation = await this.getOrCreateConversation(doctorId, patientId);

    const message = this.messagesRepository.create({
      conversationId: conversation.id,
      senderId: doctorId,
      receiverId: patientId,
      content,
      senderType: MessageSenderType.DOCTOR,
      isRead: false,
    });

    const savedMessage = await this.messagesRepository.save(message);

    // Update conversation
    conversation.lastMessageAt = new Date();
    conversation.lastMessageContent = content;
    conversation.unreadCount = await this.messagesRepository.count({
      where: {
        conversationId: conversation.id,
        receiverId: patientId,
        isRead: false,
      },
    });
    await this.conversationsRepository.save(conversation);

    return savedMessage;
  }

  async searchConversations(doctorId: string, query: string): Promise<Conversation[]> {
    return this.conversationsRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.patient', 'patient')
      .leftJoinAndSelect('conversation.doctor', 'doctor')
      .where('conversation.doctorId = :doctorId', { doctorId })
      .andWhere(
        '(LOWER(patient.firstName) LIKE LOWER(:query) OR LOWER(patient.lastName) LIKE LOWER(:query))',
        { query: `%${query}%` },
      )
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();
  }

  async getUnreadCount(doctorId: string): Promise<number> {
    return this.messagesRepository.count({
      where: {
        receiverId: doctorId,
        isRead: false,
        senderType: MessageSenderType.PATIENT,
      },
    });
  }
}
