import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Message, MessageSenderType } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/index';
import { SendMessageDto } from './dto/send-message.dto';

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

  private conversationBaseQuery(): SelectQueryBuilder<Conversation> {
    return this.conversationsRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.patient', 'patient')
      .leftJoinAndSelect('conversation.doctor', 'doctor')
      .orderBy('conversation.lastMessageAt', 'DESC');
  }

  async getConversationsForUser(user: Pick<User, 'id' | 'role'>, search?: string): Promise<Conversation[]> {
    const queryBuilder = this.conversationsRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.patient', 'patient')
      .leftJoinAndSelect('conversation.doctor', 'doctor');

    if (user.role === UserRole.DOCTOR) {
      queryBuilder.where('conversation.doctorId = :userId', { userId: user.id });
      if (search) {
        queryBuilder.andWhere(
          '(LOWER(patient.firstName) LIKE LOWER(:query) OR LOWER(patient.lastName) LIKE LOWER(:query))',
          { query: `%${search}%` },
        );
      }
    } else if (user.role === UserRole.PATIENT) {
      queryBuilder.where('conversation.patientId = :userId', { userId: user.id });
      if (search) {
        queryBuilder.andWhere(
          '(LOWER(doctor.firstName) LIKE LOWER(:query) OR LOWER(doctor.lastName) LIKE LOWER(:query))',
          { query: `%${search}%` },
        );
      }
    } else {
      return [];
    }

    const conversations = await queryBuilder
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();

    for (const conv of conversations) {
      const unread = await this.messagesRepository.count({
        where: {
          conversationId: conv.id,
          receiverId: user.id,
          isRead: false,
        },
      });
      conv.unreadCount = unread;
    }

    return conversations;
  }

  async getConversationWith(user: Pick<User, 'id' | 'role'>, counterpartyId: string): Promise<Conversation> {
    if (!counterpartyId) {
      throw new BadRequestException('Missing counterparty id');
    }

    if (user.role === UserRole.DOCTOR) {
      return this.getOrCreateConversation(user.id, counterpartyId);
    }

    if (user.role === UserRole.PATIENT) {
      return this.getOrCreateConversation(counterpartyId, user.id);
    }

    throw new ForbiddenException('Only doctors and patients can access conversations');
  }

  async getMessages(conversationId: string, user: Pick<User, 'id' | 'role'>): Promise<Message[]> {
    const conversation = await this.conversationsRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.doctorId !== user.id && conversation.patientId !== user.id) {
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
        receiverId: user.id,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    // Update conversation unread count
    if (conversation.doctorId === user.id || conversation.patientId === user.id) {
      conversation.unreadCount = 0;
      await this.conversationsRepository.save(conversation);
    }

    return messages;
  }

  async sendMessageFromUser(
    sender: Pick<User, 'id' | 'role'>,
    payload: SendMessageDto,
  ): Promise<Message> {
    let doctorId: string | undefined;
    let patientId: string | undefined;

    if (sender.role === UserRole.DOCTOR) {
      doctorId = sender.id;
      patientId = payload.patientId;
    } else if (sender.role === UserRole.PATIENT) {
      patientId = sender.id;
      doctorId = payload.doctorId;
    } else {
      throw new ForbiddenException('Only doctors and patients can send messages');
    }

    if (!doctorId || !patientId) {
      throw new BadRequestException('Missing recipient information');
    }

    const conversation = await this.getOrCreateConversation(doctorId, patientId);

    const message = this.messagesRepository.create({
      conversationId: conversation.id,
      senderId: sender.id,
      receiverId: sender.role === UserRole.DOCTOR ? patientId : doctorId,
      content: payload.content,
      senderType: sender.role === UserRole.DOCTOR ? MessageSenderType.DOCTOR : MessageSenderType.PATIENT,
      isRead: false,
    });

    const savedMessage = await this.messagesRepository.save(message);

    conversation.lastMessageAt = new Date();
    conversation.lastMessageContent = payload.content;
    await this.conversationsRepository.save(conversation);

    return this.messagesRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender', 'receiver'],
    });
  }

  async getUnreadCount(user: Pick<User, 'id' | 'role'>): Promise<{ count: number }> {
    const count = await this.messagesRepository.count({
      where: {
        receiverId: user.id,
        isRead: false,
      },
    });
    return { count };
  }
}
