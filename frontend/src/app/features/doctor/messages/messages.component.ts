import { Component, OnInit, signal, inject, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { MessageService, Conversation, Message } from '@core/services/message.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { ThemeService } from '@core/services/theme.service';
import { ToastService } from '@core/services/toast.service';

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
  // No styleUrls — Tailwind only
})
export class MessagesComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private notificationService = inject(NotificationService);
  themeService = inject(ThemeService);
  private toast = inject(ToastService);
  private router: Router = inject(Router);

  conversations = signal<Conversation[]>([]);
  selectedConversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  messageContent = signal('');
  unreadCount = signal(0);
  currentUser = signal<any>(null);

  ngOnInit(): void {
    this.loadUserData();
    this.loadConversations();
    this.loadUnreadCount();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
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
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadCount.set(count || 0)
    });
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation.set(conversation);
    this.loadMessages(conversation.id);
  }

  loadMessages(conversationId: string): void {
    this.messageService.getMessages(conversationId).subscribe({
      next: (data) => {
        this.messages.set(data);
        this.loadConversations(); // Refresh unread counts
      },
      error: () => this.toast.error('Failed to load messages')
    });
  }

  sendMessage(): void {
    const content = this.messageContent().trim();
    if (!content || !this.selectedConversation()) return;

    this.messageService.sendMessage({
      patientId: this.selectedConversation()!.patientId,
      content
    }).subscribe({
      next: () => {
        this.messageContent.set('');
        this.loadMessages(this.selectedConversation()!.id);
        this.toast.success('Message sent');
      },
      error: () => this.toast.error('Failed to send message')
    });
  }

  onSearchChange(): void {
    this.loadConversations();
  }

  getPatientName(conversation: Conversation): string {
    return conversation.patient
      ? `${conversation.patient.firstName} ${conversation.patient.lastName}`
      : 'Unknown Patient';
  }

  getPatientInitials(conversation: Conversation): string {
    const name = this.getPatientName(conversation);
    const parts = name.split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.charAt(0).toUpperCase() || 'P';
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
    return message.senderType === 'doctor';
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  onThemeChange(mode: 'light' | 'dark'): void {
    const isDark = this.themeService.isDarkMode();
    if (mode === 'dark' && !isDark) {
      this.themeService.toggleTheme();
    } else if (mode === 'light' && isDark) {
      this.themeService.toggleTheme();
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    }
  }
}