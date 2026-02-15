import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, IsNull } from 'typeorm';
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
  ) { }

  async getOrCreateConversation(params: {
    doctorId?: string | null;
    patientId?: string | null;
    receptionistId?: string | null;
  }): Promise<Conversation> {
    const { doctorId, patientId, receptionistId } = params;

    let conversation = await this.conversationsRepository.findOne({
      where: {
        doctorId: doctorId || IsNull(),
        patientId: patientId || IsNull(),
        receptionistId: receptionistId || IsNull(),
      },
      relations: ['doctor', 'patient', 'receptionist'],
    });

    if (!conversation) {
      conversation = this.conversationsRepository.create({
        doctorId: doctorId || undefined,
        patientId: patientId || undefined,
        receptionistId: receptionistId || undefined,
        unreadCount: 0,
      });
      conversation = await this.conversationsRepository.save(conversation);

      // Reload to get relations
      conversation = await this.conversationsRepository.findOne({
        where: { id: conversation.id },
        relations: ['doctor', 'patient', 'receptionist'],
      });
    }

    return conversation;
  }

  async getConversationsForUser(user: Pick<User, 'id' | 'role'>, search?: string): Promise<Conversation[]> {
    const queryBuilder = this.conversationsRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.patient', 'patient')
      .leftJoinAndSelect('conversation.doctor', 'doctor')
      .leftJoinAndSelect('conversation.receptionist', 'receptionist');

    if (user.role === UserRole.DOCTOR) {
      queryBuilder.where('conversation.doctorId = :userId', { userId: user.id });
    } else if (user.role === UserRole.PATIENT) {
      queryBuilder.where('conversation.patientId = :userId', { userId: user.id });
    } else if (user.role === UserRole.RECEPTIONIST) {
      queryBuilder.where('conversation.receptionistId = :userId', { userId: user.id });
    } else if (user.role === UserRole.ADMIN) {
      // Admins see all? Or maybe nothing. Let's say all for now if needed, but usually not.
    } else {
      return [];
    }

    if (search) {
      queryBuilder.andWhere(
        '(LOWER(patient.firstName) LIKE LOWER(:query) OR LOWER(patient.lastName) LIKE LOWER(:query) OR LOWER(doctor.firstName) LIKE LOWER(:query) OR LOWER(doctor.lastName) LIKE LOWER(:query))',
        { query: `%${search}%` },
      );
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

  async getConversationWith(user: Pick<User, 'id' | 'role'>, counterpartyId: string, counterpartyRole: UserRole): Promise<Conversation> {
    if (!counterpartyId) {
      throw new BadRequestException('Missing counterparty id');
    }

    const params: any = {};

    // Set my own role's ID
    if (user.role === UserRole.DOCTOR) params.doctorId = user.id;
    else if (user.role === UserRole.PATIENT) params.patientId = user.id;
    else if (user.role === UserRole.RECEPTIONIST) params.receptionistId = user.id;

    // Set counterparty's role's ID
    if (counterpartyRole === UserRole.DOCTOR) params.doctorId = counterpartyId;
    else if (counterpartyRole === UserRole.PATIENT) params.patientId = counterpartyId;
    else if (counterpartyRole === UserRole.RECEPTIONIST) params.receptionistId = counterpartyId;

    return this.getOrCreateConversation(params);
  }

  async getMessages(conversationId: string, user: Pick<User, 'id' | 'role'>): Promise<Message[]> {
    const conversation = await this.conversationsRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.doctorId !== user.id &&
      conversation.patientId !== user.id &&
      conversation.receptionistId !== user.id
    ) {
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

    // Update conversation unread count (not really useful here as we just read them)
    // but we can set it to 0 for the user
    // (Actually unreadCount in Conversation entity seems to be global or shared, 
    // which is not ideal for 1-v-1, but let's keep it for now)

    return messages;
  }

  async sendMessageFromUser(
    sender: Pick<User, 'id' | 'role'>,
    payload: SendMessageDto,
  ): Promise<Message> {
    const receiverId = payload.receiverId || payload.doctorId || payload.patientId || payload.receptionistId;
    const receiverRole = payload.receiverRole as UserRole || (payload.doctorId ? UserRole.DOCTOR : payload.patientId ? UserRole.PATIENT : UserRole.RECEPTIONIST);

    if (!receiverId) {
      throw new BadRequestException('Missing recipient information');
    }

    const conversation = await this.getConversationWith(sender, receiverId, receiverRole);

    const message = this.messagesRepository.create({
      conversationId: conversation.id,
      senderId: sender.id,
      receiverId: receiverId,
      content: payload.content,
      senderType: sender.role as any as MessageSenderType,
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

  async deleteConversation(conversationId: string, user: Pick<User, 'id' | 'role'>): Promise<void> {
    const conversation = await this.conversationsRepository.findOne({ where: { id: conversationId } });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.doctorId !== user.id &&
      conversation.patientId !== user.id &&
      conversation.receptionistId !== user.id
    ) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    await this.messagesRepository.delete({ conversationId });
    await this.conversationsRepository.delete(conversationId);
  }

  async deleteMessage(messageId: string, user: Pick<User, 'id' | 'role'>): Promise<Message> {
    const message = await this.messagesRepository.findOne({ where: { id: messageId } });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only sender can delete for everyone
    if (message.senderId !== user.id) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messagesRepository.delete(messageId);
    return message;
  }
}

