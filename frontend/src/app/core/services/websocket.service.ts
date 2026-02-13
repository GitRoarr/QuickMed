import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '@environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private messagesSocket: Socket | null = null;
  private notificationsSocket: Socket | null = null;
  private isMessagesConnected = false;
  private isNotificationsConnected = false;

  private messageSubject = new Subject<any>();
  private notificationSubject = new Subject<any>();
  private typingSubject = new Subject<any>();
  private conversationUpdatedSubject = new Subject<any>();

  public messages$ = this.messageSubject.asObservable();
  public notifications$ = this.notificationSubject.asObservable();
  public typing$ = this.typingSubject.asObservable();
  public conversationUpdated$ = this.conversationUpdatedSubject.asObservable();

  constructor(private authService: AuthService) { }

  private getToken(): string | null {
    const token = this.authService.getToken();
    return token;
  }

  connectMessages(): void {
    if (this.isMessagesConnected || this.messagesSocket) {
      return;
    }

    const token = this.getToken();
    if (!token) {
      console.warn('[WebSocket] No token available for messages connection');
      return;
    }

    const wsUrl = environment.apiUrl?.replace('/api', '') || 'http://localhost:3000';
    this.messagesSocket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.messagesSocket.on('connect', () => {
      console.log('[WebSocket] Messages connected');
      this.isMessagesConnected = true;
    });

    this.messagesSocket.on('disconnect', () => {
      console.log('[WebSocket] Messages disconnected');
      this.isMessagesConnected = false;
    });

    this.messagesSocket.on('message', (message: any) => {
      this.messageSubject.next(message);
    });

    this.messagesSocket.on('conversationUpdated', (data: any) => {
      this.conversationUpdatedSubject.next(data);
    });

    this.messagesSocket.on('userTyping', (data: any) => {
      this.typingSubject.next(data);
    });

    this.messagesSocket.on('error', (error: any) => {
      console.error('[WebSocket] Messages error:', error);
    });
  }

  connectNotifications(): void {
    if (this.isNotificationsConnected || this.notificationsSocket) {
      return;
    }

    const token = this.getToken();
    if (!token) {
      console.warn('[WebSocket] No token available for notifications connection');
      return;
    }

    const wsUrl = environment.apiUrl?.replace('/api', '') || 'http://localhost:3000';
    this.notificationsSocket = io(`${wsUrl}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.notificationsSocket.on('connect', () => {
      console.log('[WebSocket] Notifications connected');
      this.isNotificationsConnected = true;
      // Subscribe to notifications
      this.notificationsSocket?.emit('subscribe');
    });

    this.notificationsSocket.on('disconnect', () => {
      console.log('[WebSocket] Notifications disconnected');
      this.isNotificationsConnected = false;
    });

    this.notificationsSocket.on('newNotification', (notification: any) => {
      this.notificationSubject.next(notification);
    });

    this.notificationsSocket.on('unreadCount', (data: { count: number }) => {
      this.notificationSubject.next({ type: 'unreadCount', count: data.count });
    });

    this.notificationsSocket.on('notifications', (data: { notifications: any[] }) => {
      this.notificationSubject.next({ type: 'notifications', notifications: data.notifications });
    });

    this.notificationsSocket.on('error', (error: any) => {
      console.error('[WebSocket] Notifications error:', error);
    });
  }

  joinConversation(conversationId: string): void {
    if (this.messagesSocket && this.isMessagesConnected) {
      this.messagesSocket.emit('joinConversation', { conversationId });
    }
  }

  sendMessage(payload: {
    content: string;
    patientId?: string;
    doctorId?: string;
    conversationId?: string;
    receiverId?: string;
    receiverRole?: string;
  }): void {
    if (this.messagesSocket && this.isMessagesConnected) {
      this.messagesSocket.emit('sendMessage', payload);
    }
  }

  sendTyping(conversationId: string, isTyping: boolean): void {
    if (this.messagesSocket && this.isMessagesConnected) {
      this.messagesSocket.emit('typing', { conversationId, isTyping });
    }
  }

  markNotificationAsRead(notificationId: string): void {
    if (this.notificationsSocket && this.isNotificationsConnected) {
      this.notificationsSocket.emit('markAsRead', { notificationId });
    }
  }

  markAllNotificationsAsRead(): void {
    if (this.notificationsSocket && this.isNotificationsConnected) {
      this.notificationsSocket.emit('markAllAsRead');
    }
  }

  disconnectMessages(): void {
    if (this.messagesSocket) {
      this.messagesSocket.disconnect();
      this.messagesSocket = null;
      this.isMessagesConnected = false;
    }
  }

  disconnect(): void {
    if (this.messagesSocket) {
      this.messagesSocket.disconnect();
      this.messagesSocket = null;
      this.isMessagesConnected = false;
    }

    if (this.notificationsSocket) {
      this.notificationsSocket.disconnect();
      this.notificationsSocket = null;
      this.isNotificationsConnected = false;
    }
  }

  reconnect(): void {
    this.disconnect();
    setTimeout(() => {
      this.connectMessages();
      this.connectNotifications();
    }, 1000);
  }
}
