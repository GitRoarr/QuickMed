import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, Conversation, Message } from '@core/services/message.service';
import { MessagesSocketService } from '@core/services/messages-socket.service';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { PatientShellComponent } from '../shared/patient-shell/patient-shell.component';

@Component({
  selector: 'app-patient-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, PatientShellComponent],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css'],
})
export class PatientMessagesComponent implements OnInit, OnDestroy {
  private readonly messageService = inject(MessageService);
  private readonly socketService = inject(MessagesSocketService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  conversations = signal<Conversation[]>([]);
  messages = signal<Message[]>([]);
  selectedConversation = signal<Conversation | null>(null);
  messageContent = signal('');
  searchQuery = signal('');
  isLoadingConversations = signal(true);

  ngOnInit(): void {
    this.socketService.connect();
    this.registerSocketEvents();
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  private registerSocketEvents(): void {
    this.socketService.onMessage((message) => {
      if (this.selectedConversation()?.id === message.conversationId) {
        this.messages.update((current) => [...current, message]);
      }
      this.loadConversations(false);
    });
    this.socketService.onConversationUpdated(() => {
      this.loadConversations(false);
    });
  }

  loadConversations(showLoader = true): void {
    if (showLoader) {
      this.isLoadingConversations.set(true);
    }
    this.messageService.getConversations(this.searchQuery() || undefined).subscribe({
      next: (data) => {
        this.conversations.set(data);
        this.isLoadingConversations.set(false);
        if (!this.selectedConversation() && data.length) {
          this.selectConversation(data[0]);
        }
      },
      error: () => {
        this.isLoadingConversations.set(false);
        this.toast.error('Could not load conversations', { title: 'Messages' });
      },
    });
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation.set(conversation);
    this.socketService.joinConversation(conversation.id);
    this.loadMessages(conversation.id);
  }

  loadMessages(conversationId: string): void {
    this.messageService.getMessages(conversationId).subscribe({
      next: (data) => {
        this.messages.set(data);
      },
      error: () => {
        this.toast.error('Could not load messages', { title: 'Messages' });
      },
    });
  }

  sendMessage(): void {
    const content = this.messageContent().trim();
    const conversation = this.selectedConversation();
    if (!content || !conversation) return;

    this.messageService
      .sendMessage({
        doctorId: conversation.doctorId,
        content,
      })
      .subscribe({
        next: (message) => {
          this.messageContent.set('');
          this.messages.update((current) => [...current, message]);
          this.socketService.sendMessage({
            doctorId: conversation.doctorId,
            content,
          });
          this.loadConversations(false);
          this.toast.success('Message sent', { position: 'bottom-right' });
        },
        error: () => {
          this.toast.error('Delivery failed', { title: 'Try again', duration: 0, position: 'bottom-right' });
        },
      });
  }

  getRecipientName(conversation: Conversation): string {
    if (conversation.doctor) {
      return `Dr. ${conversation.doctor.firstName} ${conversation.doctor.lastName}`;
    }
    return 'Doctor';
  }

  isOwnMessage(message: Message): boolean {
    const currentUser = this.authService.currentUser();
    return message.senderId === currentUser?.id;
  }
}

