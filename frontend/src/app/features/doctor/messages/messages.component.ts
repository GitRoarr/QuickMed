import { Component, OnInit, signal, inject, AfterViewChecked, ElementRef, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subscription } from 'rxjs';

import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { MessageService, Conversation, Message } from '@core/services/message.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { ThemeService } from '@core/services/theme.service';
import { ToastService } from '@core/services/toast.service';
import { WebSocketService } from '@core/services/websocket.service';

@Component({
  selector: 'app-doctor-messages',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterModule,
    FormsModule,
    DoctorSidebarComponent,
    DoctorHeaderComponent
  ],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class MessagesComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private notificationService = inject(NotificationService);
  private wsService = inject(WebSocketService);
  themeService = inject(ThemeService);
  private toast = inject(ToastService);
  private router: Router = inject(Router);
  private route = inject(ActivatedRoute);

  conversations = signal<Conversation[]>([]);
  selectedConversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  messageContent = signal('');
  unreadCount = signal(0);
  currentUser = signal<any>(null);
  actionsMenuOpen = signal(false);
  isMobile = signal(typeof window !== 'undefined' && window.innerWidth < 1024);

  // Pickers
  showEmojiPicker = signal(false);
  showGifPicker = signal(false);
  gifSearchQuery = signal('');
  gifs = signal<any[]>([]);
  isLoadingGifs = signal(false);

  // Common Emojis
  emojis = ['😀', '😂', '😍', '👍', '🙏', '🎉', '🔥', '🤔', '😊', '🥳', '👋', '❤️', '✅', '❌', '🏥', '💊'];

  // Real-time
  isTyping = signal(false);
  typingUser = signal<string | null>(null);
  private subscriptions = new Subscription();

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(typeof window !== 'undefined' && window.innerWidth < 1024);
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadConversations();
    this.loadUnreadCount();
    this.bindDeepLink();

    // Connect WebSocket
    this.wsService.connectMessages();

    // Subscribe to messages
    this.subscriptions.add(
      this.wsService.messages$.subscribe((msg: any) => {
        if (!msg) return;

        // Update messages list if conversation is active
        if (this.selectedConversation()?.id === msg.conversationId) {
          const formattedMsg: Message = {
            ...msg,
            senderType: msg.sender?.role || 'patient', // fallback
            createdAt: msg.createdAt || new Date().toISOString()
          };
          this.messages.update(msgs => {
            const exists = msgs.some(m => m.id === formattedMsg.id);
            return exists ? msgs : [...msgs, formattedMsg];
          });

          // Mark as read immediately if viewing
          // this.messageService.markAsRead(msg.id).subscribe(); // If implemented
          this.scrollToBottom();
        }

        // Update conversation list preview
        this.updateConversationPreview(msg);
        this.loadUnreadCount();
      })
    );

    // Subscribe to typing
    this.subscriptions.add(
      this.wsService.typing$.subscribe((data: any) => {
        if (this.selectedConversation()?.id === data.conversationId) {
          if (data.userId !== this.currentUser()?.id) {
            this.typingUser.set(data.isTyping ? 'Typing...' : null);
          }
        }
      })
    );

    // Subscribe to message deletions
    this.subscriptions.add(
      this.wsService.messageDeleted$.subscribe((data: any) => {
        if (!data) return;
        if (this.selectedConversation()?.id === data.conversationId) {
          this.messages.update(msgs => msgs.filter(m => m.id !== data.messageId));
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.wsService.disconnectMessages();
  }

  private bindDeepLink(): void {
    this.route.queryParams.subscribe((params) => {
      const patientId = params['patientId'];
      if (patientId) {
        this.messageService.getConversationWith(patientId).subscribe({
          next: (conversation) => {
            this.selectedConversation.set(conversation);
            this.loadMessages(conversation.id);
            this.loadConversations();
          },
          error: () => this.toast.error('Failed to open conversation'),
        });
      }
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  removeConversation(conversationId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.messageService.deleteConversation(conversationId).subscribe({
      next: () => {
        this.conversations.update(convos => convos.filter(c => c.id !== conversationId));
        if (this.selectedConversation()?.id === conversationId) {
          this.selectedConversation.set(null);
        }
        this.toast.success('Conversation removed');
      },
      error: () => this.toast.error('Failed to remove conversation'),
    });
  }

  loadUserData(): void {
    this.currentUser.set(this.authService.currentUser());
  }

  loadConversations(): void {
    this.isLoading.set(true);
    this.messageService.getConversations(this.searchQuery() || undefined).subscribe({
      next: (data) => {
        this.conversations.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadUnreadCount(): void {
    this.messageService.getUnreadCount().subscribe({
      next: (count) => this.unreadCount.set(count?.count || 0),
      error: () => this.unreadCount.set(0),
    });
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation.set(conversation);
    this.actionsMenuOpen.set(false);
    this.loadMessages(conversation.id);
    this.typingUser.set(null);
    this.showEmojiPicker.set(false);
    this.showGifPicker.set(false);
  }

  loadMessages(conversationId: string): void {
    this.messageService.getMessages(conversationId).subscribe({
      next: (data) => {
        this.messages.set(data);
        // Mark conversation as read (locally for now, backend usually handles on fetch or dedicated endpoint)
        // Optimistically update unread count for this convo
        this.conversations.update(convos => convos.map(c =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ));
      },
      error: () => this.toast.error('Failed to load messages')
    });
  }

  sendMessage(): void {
    const content = this.messageContent().trim();
    if (!content || !this.selectedConversation()) return;

    const conversation = this.selectedConversation()!;
    const receiverId = conversation.patientId || conversation.patient?.id;
    // Determine receiver role. Assuming patient for now if doctor chat.
    // But could be receptionist.
    // If it's a conversation with patient, role is patient.
    const receiverRole = conversation.patientId ? 'patient' : conversation.receptionistId ? 'receptionist' : 'doctor';

    if (!receiverId) return;

    // Use WebSocket for sending
    this.wsService.sendMessage({
      content,
      receiverId,
      receiverRole: receiverRole as any // assuming 'patient' | 'doctor' | 'receptionist'
    } as any);

    // Optimistic update
    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      conversationId: conversation.id,
      senderId: this.currentUser()?.id,
      receiverId: receiverId,
      content,
      senderType: 'doctor',
      isRead: false,
      createdAt: new Date().toISOString()
    };

    this.messages.update(msgs => [...msgs, tempMsg]);
    this.messageContent.set('');

    // update preview
    this.updateConversationPreview(tempMsg);
  }

  deleteMessage(messageId: string, event: MouseEvent): void {
    event.stopPropagation();
    if (messageId.startsWith('temp-')) return; // Can't delete temp messages yet

    this.wsService.deleteMessage(messageId);
    // Optimistic update
    this.messages.update(msgs => msgs.filter(m => m.id !== messageId));
    this.toast.success('Message deleted');
  }

  onTyping(): void {
    const conv = this.selectedConversation();
    if (conv) {
      this.wsService.sendTyping(conv.id, this.messageContent().length > 0);
    }
  }

  private updateConversationPreview(msg: Message | any) {
    this.conversations.update(convos => {
      const idx = convos.findIndex(c => c.id === msg.conversationId);
      if (idx !== -1) {
        const updated = [...convos];
        updated[idx] = {
          ...updated[idx],
          lastMessageContent: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: (msg.senderId !== this.currentUser()?.id && this.selectedConversation()?.id !== msg.conversationId)
            ? updated[idx].unreadCount + 1
            : updated[idx].unreadCount
        };
        // Move to top
        const [moved] = updated.splice(idx, 1);
        updated.unshift(moved);
        return updated;
      }
      return convos;
    });
  }

  onSearchChange(): void {
    this.loadConversations();
  }

  getPatientName(conversation: Conversation): string {
    if (conversation.patient) {
      return `${conversation.patient.firstName} ${conversation.patient.lastName}`;
    }
    if (conversation.receptionist) {
      return `${conversation.receptionist.firstName} ${conversation.receptionist.lastName} (Receptionist)`;
    }
    return 'Unknown';
    // Logic needs to adapt if chatting with someone else
  }

  getPatientInitials(conversation: Conversation): string {
    const name = this.getPatientName(conversation);
    const parts = name.replace('(Receptionist)', '').trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.charAt(0).toUpperCase() || '?';
  }

  getTimeAgo(date: string | undefined): string {
    if (!date) return '—';
    const now = Date.now();
    const msgTime = new Date(date).getTime();
    const diff = now - msgTime;
    const minute = 60000;
    const hour = minute * 60;
    const day = hour * 24;

    if (diff < minute) return 'Just now';
    if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
    if (diff < day) return `${Math.floor(diff / hour)}h ago`;
    if (diff < day * 7) return `${Math.floor(diff / day)}d ago`;
    return new Date(date).toLocaleDateString();
  }

  getDoctorInitials(): string {
    const user = this.currentUser();
    if (!user) return 'DR';
    const name = `${user.firstName} ${user.lastName}`;
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  isMyMessage(message: Message): boolean {
    return message.senderId === this.currentUser()?.id;
    // Safer than relying on senderType string match, since backend might send 'doctor' or 'receptionist'
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  toggleActionsMenu(): void {
    this.actionsMenuOpen.set(!this.actionsMenuOpen());
  }

  startCall(type: 'audio' | 'video'): void {
    const conversation = this.selectedConversation();
    if (!conversation) {
      this.toast.warning('Select a conversation first');
      return;
    }
    this.actionsMenuOpen.set(false);
    this.router.navigate(['/call', conversation.id], { queryParams: { mode: type } });
  }

  openPatientRecords(): void {
    const conversation = this.selectedConversation();
    if (!conversation) return;
    const patientId = conversation.patientId || conversation.patient?.id;
    if (!patientId) {
      this.toast.warning('Patient details not available');
      return;
    }
    this.actionsMenuOpen.set(false);
    this.router.navigate(['/doctor/patients', patientId]);
  }

  openPatientProfile(): void {
    const conversation = this.selectedConversation();
    if (!conversation) return;
    const patientId = conversation.patientId || conversation.patient?.id;
    if (!patientId) {
      this.toast.warning('Patient details not available');
      return;
    }
    this.actionsMenuOpen.set(false);
    this.router.navigate(['/doctor/patients', patientId]);
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker.update(v => !v);
    if (this.showEmojiPicker()) this.showGifPicker.set(false);
  }

  addEmoji(emoji: string): void {
    this.messageContent.update(c => c + emoji);
    this.showEmojiPicker.set(false);
  }

  toggleGifPicker(): void {
    this.showGifPicker.update(v => !v);
    if (this.showGifPicker()) {
      this.showEmojiPicker.set(false);
      this.searchGifs();
    }
  }

  searchGifs(): void {
    this.isLoadingGifs.set(true);
    // Simulate API call or use real one if available. 
    // Using placeholders for demo as in Receptionist component.
    setTimeout(() => {
      this.gifs.set([
        { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXcwOHZ1eGZtbnYwZnN6bnYwZnMzbnYwZnM0bnYwZnM1bnYwZnM2/3o7TKSjRrfIPjeiVyM/giphy.gif' },
        { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXcwOHZ1eGZtbnYwZnN6bnYwZnMzbnYwZnM0bnYwZnM1bnYwZnM2/26AHP7PeRRbAqn6vK/giphy.gif' },
        { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXcwOHZ1eGZtbnYwZnN6bnYwZnMzbnYwZnM0bnYwZnM1bnYwZnM2/l0HlHFRb68qGNj80M/giphy.gif' }
      ]);
      this.isLoadingGifs.set(false);
    }, 500);
  }

  selectGif(gif: any): void {
    const gifContent = `![gif](${gif.url})`;
    // Send directly as message
    this.messageContent.set(gifContent);
    this.sendMessage();
    this.showGifPicker.set(false);
  }

  isGif(content: string): boolean {
    return content.startsWith('![gif](') && content.endsWith(')');
  }

  getGifUrl(content: string): string {
    return content.substring(7, content.length - 1);
  }

  copyConversationId(): void {
    const conversation = this.selectedConversation();
    if (!conversation) return;
    navigator.clipboard.writeText(conversation.id);
    this.actionsMenuOpen.set(false);
    this.toast.success('Conversation ID copied');
  }

  triggerFileSelect(): void {
    const fileInput = document.getElementById('message-file-input') as HTMLInputElement;
    fileInput?.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.toast.info(`File "${file.name}" selected. Upload started.`, { title: 'Attachment' });
      // Logic for upload...
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    }
  }
}