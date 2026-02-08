import { Controller, Get, Post, Body, Param, Query, UseGuards, Delete } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@CurrentUser() user: User, @Query('search') search?: string) {
    return this.messagesService.getConversationsForUser(user, search);
  }

  @Get('conversations/with/:counterpartyId')
  getConversationWith(
    @Param('counterpartyId') counterpartyId: string,
    @CurrentUser() user: User,
  ) {
    return this.messagesService.getConversationWith(user, counterpartyId);
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
}
