import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { MessageService, Conversation, Message } from '@core/services/message.service';
import { AppointmentService } from '@core/services/appointment.service';
import { ToastService } from '@core/services/toast.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-doctor-messages',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DatePipe, DoctorSidebarComponent],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private appointmentService = inject(AppointmentService);
  private toast = inject(ToastService);

  conversations = signal<Conversation[]>([]);
  selectedConversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  messageContent = signal('');
  unreadCount = signal(0);
  currentUser = signal<any>(null);

  menuItems = signal<MenuItem[]>([]);

  ngOnInit(): void {
    this.loadUserData();
    this.loadConversations();
    this.loadUnreadCount();
    this.loadBadgeCounts();
  }

  loadBadgeCounts(): void {
    this.appointmentService.getPendingCount().subscribe({
      next: (data) => {
        this.updateMenuItems(data.count || 0, this.unreadCount());
      }
    });
  }

  updateMenuItems(appointmentCount: number, messageCount: number): void {
    this.menuItems.set([
      { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
      { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: appointmentCount > 0 ? appointmentCount : undefined },
      { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
      { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
      { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/doctor/records' },
      { label: 'Prescriptions', icon: 'bi-prescription2', route: '/doctor/prescriptions' },
      { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: messageCount > 0 ? messageCount : undefined },
      { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
      { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
    ]);
  }

  loadUserData(): void {
    const user = this.authService.currentUser();
    this.currentUser.set(user);
  }

  loadConversations(): void {
    this.isLoading.set(true);
    this.messageService.getConversations(this.searchQuery() || undefined).subscribe({
      next: (data) => {
        this.conversations.set(data);
        this.isLoading.set(false);
        // Update badge count
        const totalUnread = data.reduce((sum, conv) => sum + conv.unreadCount, 0);
        this.unreadCount.set(totalUnread);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Could not load conversations', { title: 'Messages' });
      }
    });
  }

  loadUnreadCount(): void {
    this.messageService.getUnreadCount().subscribe({
      next: (data: any) => {
        this.unreadCount.set(data.count || 0);
        this.appointmentService.getPendingCount().subscribe({
          next: (aptData) => {
            this.updateMenuItems(aptData.count || 0, data.count || 0);
          }
        });
      }
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
        // Reload conversations to update unread count
        this.loadConversations();
      },
      error: () => {
        this.toast.error('Could not load messages', { title: 'Messages' });
      }
    });
  }

  sendMessage(): void {
    const content = this.messageContent().trim();
    if (!content || !this.selectedConversation()) return;

    this.messageService.sendMessage({ patientId: this.selectedConversation()!.patientId, content }).subscribe({
      next: (message) => {
        this.messageContent.set('');
        this.loadMessages(this.selectedConversation()!.id);
        this.loadConversations();
        this.toast.success('Message sent', { position: 'bottom-right' });
      },
      error: () => {
        this.toast.error('Delivery failed', { title: 'Try again', duration: 0, position: 'bottom-right' });
      }
    });
  }

  onSearchChange(): void {
    this.loadConversations();
  }

  getPatientName(conversation: Conversation): string {
    if (conversation.patient) {
      return `${conversation.patient.firstName} ${conversation.patient.lastName}`;
    }
    return 'Unknown Patient';
  }

  getPatientInitials(conversation: Conversation): string {
    const name = this.getPatientName(conversation);
    if (!name) return 'P';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 1).toUpperCase();
  }

  getTimeAgo(date: string | undefined): string {
    if (!date) return '';
    const now = new Date();
    const msgDate = new Date(date);
    const diffMs = now.getTime() - msgDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return msgDate.toLocaleDateString();
  }

  getDoctorName(): string {
    const user = this.currentUser();
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Doctor';
  }

  getDoctorSpecialty(): string {
    const user = this.currentUser();
    return user?.specialty || 'General Practitioner';
  }

  getDoctorInitials(): string {
    const name = this.getDoctorName();
    if (!name) return 'DR';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  isMyMessage(message: Message): boolean {
    return message.senderType === 'doctor';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  setTheme(theme: 'light' | 'dark') {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
    localStorage.setItem('theme', theme);
  }
}
