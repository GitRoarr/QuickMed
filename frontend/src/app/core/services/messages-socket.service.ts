import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '@environments/environment';
import { AuthService } from './auth.service';

interface MessagePayload {
  content: string;
  patientId?: string;
  doctorId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MessagesSocketService implements OnDestroy {
  private socket?: Socket;

  constructor(private readonly authService: AuthService) { }

  connect(): void {
    if (this.socket || !this.authService.getToken()) {
      return;
    }

    this.socket = io(environment.apiUrl.replace('/api', ''), {
      transports: ['websocket'],
      auth: { token: this.authService.getToken() },
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
  }

  joinConversation(conversationId: string): void {
    this.socket?.emit('joinConversation', { conversationId });
  }

  sendMessage(payload: MessagePayload): void {
    this.socket?.emit('sendMessage', payload);
  }

  deleteMessage(messageId: string): void {
    this.socket?.emit('deleteMessage', { messageId });
  }

  onMessage(handler: (message: any) => void): void {
    this.socket?.on('message', handler);
  }

  offMessage(handler: (message: any) => void): void {
    this.socket?.off('message', handler);
  }

  onConversationUpdated(handler: (event: { conversationId: string }) => void): void {
    this.socket?.on('conversationUpdated', handler);
  }

  offConversationUpdated(handler: (event: { conversationId: string }) => void): void {
    this.socket?.off('conversationUpdated', handler);
  }

  onMessageDeleted(handler: (event: { messageId: string; conversationId: string }) => void): void {
    this.socket?.on('messageDeleted', handler);
  }

  offMessageDeleted(handler: (event: { messageId: string; conversationId: string }) => void): void {
    this.socket?.off('messageDeleted', handler);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}

