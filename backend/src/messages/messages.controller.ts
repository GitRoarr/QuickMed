import { Controller, Get, Post, Body, Param, Query, UseGuards, Delete, BadRequestException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/index';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }

  @Get('conversations')
  getConversations(@CurrentUser() user: User, @Query('search') search?: string) {
    return this.messagesService.getConversationsForUser(user, search);
  }

  @Get('conversations/with/:counterpartyId')
  getConversationWith(
    @Param('counterpartyId') counterpartyId: string,
    @CurrentUser() user: User,
    @Query('role') role?: UserRole,
  ) {
    let counterpartyRole = role;
    if (!counterpartyRole) {
      if (user.role === UserRole.DOCTOR) counterpartyRole = UserRole.PATIENT;
      else if (user.role === UserRole.PATIENT) counterpartyRole = UserRole.DOCTOR;
      else if (user.role === UserRole.RECEPTIONIST) counterpartyRole = UserRole.DOCTOR;
      else throw new BadRequestException('Could not determine counterparty role');
    }
    return this.messagesService.getConversationWith(user, counterpartyId, counterpartyRole);
  }

  @Post('conversations')
  createConversation(
    @Body() body: { patientId?: string; doctorId?: string; receptionistId?: string; role?: UserRole },
    @CurrentUser() user: User,
  ) {
    let counterpartyId = body.patientId || body.doctorId || body.receptionistId;
    let counterpartyRole = body.role;

    if (!counterpartyRole) {
      if (body.patientId) counterpartyRole = UserRole.PATIENT;
      else if (body.doctorId) counterpartyRole = UserRole.DOCTOR;
      else if (body.receptionistId) counterpartyRole = UserRole.RECEPTIONIST;
      else {
        if (user.role === UserRole.DOCTOR) counterpartyRole = UserRole.PATIENT;
        else if (user.role === UserRole.PATIENT) counterpartyRole = UserRole.DOCTOR;
        else if (user.role === UserRole.RECEPTIONIST) counterpartyRole = UserRole.DOCTOR;
      }
    }

    if (!counterpartyId) {
      throw new BadRequestException('Missing counterparty id');
    }

    if (!counterpartyRole) {
      throw new BadRequestException('Could not determine counterparty role');
    }

    return this.messagesService.getConversationWith(user, counterpartyId, counterpartyRole);
  }

  @Get('conversations/:conversationId')
  getMessages(@Param('conversationId') conversationId: string, @CurrentUser() user: User) {
    return this.messagesService.getMessages(conversationId, user);
  }

  @Post('send')
  sendMessage(@Body() body: SendMessageDto, @CurrentUser() user: User) {
    return this.messagesService.sendMessageFromUser(user, body);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: User) {
    return this.messagesService.getUnreadCount(user);
  }

  @Delete('conversations/:conversationId')
  deleteConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: User,
  ) {
    return this.messagesService.deleteConversation(conversationId, user);
  }

  @Delete(':messageId')
  deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: User,
  ) {
    return this.messagesService.deleteMessage(messageId, user);
  }
}
