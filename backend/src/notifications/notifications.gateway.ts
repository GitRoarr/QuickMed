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
import { NotificationsService } from './notifications.service';
import { Injectable } from '@nestjs/common';
import { NotificationIntegrationService } from './notification-integration.service';

@Injectable()
@WebSocketGateway({ 
  namespace: '/notifications',
  cors: { 
    origin: '*',
    credentials: true 
  } 
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, Socket[]>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationIntegrationService: NotificationIntegrationService,
  ) {
    // Inject gateway into integration service to avoid circular dependency
    if (this.notificationIntegrationService) {
      (this.notificationIntegrationService as any).setGateway(this);
    }
  }

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

      const userId = payload.sub || payload.id;
      if (!userId) {
        client.disconnect(true);
        return;
      }

      client.data.userId = userId;
      
      // Join user's notification room
      client.join(`user:${userId}`);
      
      // Track connected clients
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, []);
      }
      this.connectedUsers.get(userId)!.push(client);

      // Send unread count on connection
      const unreadCount = await this.notificationsService.getUnreadCount(userId);
      client.emit('unreadCount', { count: unreadCount });

      console.log(`[NotificationsGateway] User ${userId} connected. Unread: ${unreadCount}`);
    } catch (error) {
      console.error('[NotificationsGateway] Connection error:', error);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const userClients = this.connectedUsers.get(userId);
      if (userClients) {
        const index = userClients.indexOf(client);
        if (index > -1) {
          userClients.splice(index, 1);
        }
        if (userClients.length === 0) {
          this.connectedUsers.delete(userId);
        }
      }
      console.log(`[NotificationsGateway] User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(client: Socket, payload: { notificationId: string }) {
    const userId = client.data.userId;
    if (!userId || !payload?.notificationId) return;

    try {
      await this.notificationsService.markAsRead(payload.notificationId);
      const unreadCount = await this.notificationsService.getUnreadCount(userId);
      this.server.to(`user:${userId}`).emit('unreadCount', { count: unreadCount });
      client.emit('notificationRead', { notificationId: payload.notificationId });
    } catch (error) {
      client.emit('error', { message: 'Failed to mark notification as read' });
    }
  }

  @SubscribeMessage('markAllAsRead')
  async handleMarkAllAsRead(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      await this.notificationsService.markAllAsRead(userId);
      this.server.to(`user:${userId}`).emit('unreadCount', { count: 0 });
      client.emit('allNotificationsRead', {});
    } catch (error) {
      client.emit('error', { message: 'Failed to mark all notifications as read' });
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    // User is already subscribed via room, but we can send current notifications
    const { notifications } = await this.notificationsService.findAll(userId, 1, 10);
    client.emit('notifications', { notifications });
  }

  // Method to send notification to user
  async sendNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('newNotification', notification);
    
    // Update unread count
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    this.server.to(`user:${userId}`).emit('unreadCount', { count: unreadCount });
  }

  // Method to send notification to multiple users
  async sendNotificationToUsers(userIds: string[], notification: any) {
    userIds.forEach(userId => {
      this.server.to(`user:${userId}`).emit('newNotification', notification);
    });

    // Update unread counts for all users
    for (const userId of userIds) {
      const unreadCount = await this.notificationsService.getUnreadCount(userId);
      this.server.to(`user:${userId}`).emit('unreadCount', { count: unreadCount });
    }
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
