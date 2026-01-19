import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from './messages.service';
import { UserRole } from '../common/index';

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messagesService: MessagesService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload: any = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'defaultSecret',
      });

      client.data.user = {
        id: payload.sub || payload.id,
        role: payload.role as UserRole,
      };

      client.join(client.data.user.id);
    } catch (error) {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    for (const room of client.rooms) {
      if (room !== client.id) {
        client.leave(room);
      }
    }
  }

  @SubscribeMessage('joinConversation')
  handleJoinConversation(client: Socket, payload: { conversationId: string }) {
    if (payload?.conversationId) {
      client.join(payload.conversationId);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    client: Socket,
    payload: { content: string; patientId?: string; doctorId?: string; conversationId?: string },
  ) {
    const user = client.data.user as { id: string; role: UserRole } | undefined;
    if (!user || !payload?.content) {
      client.emit('error', { message: 'Invalid message payload' });
      return;
    }

    try {
      const message = await this.messagesService.sendMessageFromUser(user, payload as any);
      if (!message) {
        client.emit('error', { message: 'Failed to send message' });
        return;
      }

      // Emit to conversation room
      this.server.to(message.conversationId).emit('message', {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        receiverId: message.receiverId,
        conversationId: message.conversationId,
        senderType: message.senderType,
        isRead: message.isRead,
        createdAt: message.createdAt,
        sender: message.sender,
        receiver: message.receiver,
      });

      // Notify receiver about new message
      this.server.to(message.receiverId).emit('conversationUpdated', {
        conversationId: message.conversationId,
        lastMessage: message.content,
        lastMessageAt: message.createdAt,
      });

      // Confirm to sender
      client.emit('messageSent', { messageId: message.id });
    } catch (error) {
      console.error('[MessagesGateway] Error sending message:', error);
      client.emit('error', { message: 'Failed to send message', error: error.message });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, payload: { conversationId: string; isTyping: boolean }) {
    const user = client.data.user as { id: string; role: UserRole } | undefined;
    if (!user || !payload?.conversationId) return;

    // Emit typing status to conversation (excluding sender)
    client.to(payload.conversationId).emit('userTyping', {
      userId: user.id,
      conversationId: payload.conversationId,
      isTyping: payload.isTyping,
    });
  }

  private extractToken(client: Socket): string | undefined {
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return undefined;
  }
}

