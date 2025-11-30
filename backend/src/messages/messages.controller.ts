import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@CurrentUser() user: User, @Query('search') search?: string) {
    if (search) {
      return this.messagesService.searchConversations(user.id, search);
    }
    return this.messagesService.getConversations(user.id);
  }

  @Get('conversations/:conversationId')
  getMessages(@Param('conversationId') conversationId: string, @CurrentUser() user: User) {
    return this.messagesService.getMessages(conversationId, user.id);
  }

  @Post('send')
  sendMessage(
    @Body('patientId') patientId: string,
    @Body('content') content: string,
    @CurrentUser() user: User,
  ) {
    return this.messagesService.sendMessage(user.id, patientId, content);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: User) {
    return this.messagesService.getUnreadCount(user.id);
  }
}
