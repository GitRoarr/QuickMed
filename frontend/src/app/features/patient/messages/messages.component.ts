import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, Conversation, Message } from '@core/services/message.service';
import { MessagesSocketService } from '@core/services/messages-socket.service';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { Router } from '@angular/router';
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
  private readonly router = inject(Router);

  conversations = signal<Conversation[]>([]);
  messages = signal<Message[]>([]);
  selectedConversation = signal<Conversation | null>(null);
  messageContent = signal('');
  searchQuery = signal('');
  isLoadingConversations = signal(true);

  // Functional UI state
  showEmojiPicker = signal(false);
  emojis = ['😊', '😂', '🥰', '😍', '🤔', '👍', '🙏', '💉', '🩹', '🌡️', '💊', '🩺', '🏥', '👋', '✨'];

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
        this.messages.update((current) => {
          const exists = current.some(m => m.id === message.id);
          return exists ? current : [...current, message];
        });
      }
      this.loadConversations(false);
    });
    this.socketService.onConversationUpdated(() => {
      this.loadConversations(false);
    });
    this.socketService.onMessageDeleted((data) => {
      if (this.selectedConversation()?.id === data.conversationId) {
        this.messages.update((current) => current.filter(m => m.id !== data.messageId));
      }
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

  deleteMessage(messageId: string, event: MouseEvent): void {
    event.stopPropagation();
    if (!messageId) return;
    this.socketService.deleteMessage(messageId);
    // Optimistic update
    this.messages.update(msgs => msgs.filter(m => m.id !== messageId));
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

  // --- NEW FUNCTIONAL HANDLERS ---

  triggerCall(): void {
    const conversation = this.selectedConversation();
    if (!conversation) return;
    this.toast.info('Starting audio call...', { title: 'Calling' });
    this.router.navigate(['/call', conversation.id], { queryParams: { audio: true } });
  }

  triggerVideoCall(): void {
    const conversation = this.selectedConversation();
    if (!conversation) return;
    this.toast.info('Starting video consultation...', { title: 'Video Call' });
    this.router.navigate(['/call', conversation.id]);
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker.update(v => !v);
  }

  addEmoji(emoji: string): void {
    this.messageContent.update(v => v + emoji);
    this.showEmojiPicker.set(false);
    // Focus back to textarea if needed (could use ViewChild for this)
  }

  triggerFileSelect(): void {
    const fileInput = document.getElementById('message-file-input') as HTMLInputElement;
    fileInput?.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.toast.info(`File "${file.name}" selected. Ready to upload (mock).`, { title: 'Attachment' });
      // In a real app, you'd upload this to a storage service and send the URL in the message
    }
  }
}

