import { Component, inject, HostListener, OnInit, OnDestroy, signal } from '@angular/core';
import { ThemeService } from '@core/services/theme.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { MessageService, Conversation } from '@core/services/message.service';
import { NotificationService } from '@core/services/notification.service';
import { WebSocketService } from '@core/services/websocket.service';
import { Notification } from '@core/models/notification.model';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface PatientNavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-patient-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-shell.component.html',
  styleUrls: ['./patient-shell.component.css'],
})
export class PatientShellComponent implements OnInit, OnDestroy {
  sidebarOpen = false;
  mobile = false;
  themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  readonly notificationService = inject(NotificationService);
  private readonly websocketService = inject(WebSocketService);
  private readonly destroy$ = new Subject<void>();

  unreadMessages = signal(0);
  unreadNotifications = signal(0);
  notificationsOpen = signal(false);
  messagesOpen = signal(false);

  notifications = signal<Notification[]>([]);
  conversations = signal<Conversation[]>([]);

  isLoadingNotifications = signal(false);
  isLoadingMessages = signal(false);

  menuItems: PatientNavItem[] = [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/patient/dashboard' },
    { label: 'Appointments', icon: 'bi-calendar3', route: '/patient/appointments' },
    { label: 'Find Doctors', icon: 'bi-people', route: '/patient/doctors' },
    { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/patient/records' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/patient/messages' },
    { label: 'Profile', icon: 'bi-person', route: '/patient/profile' },
    { label: 'Settings', icon: 'bi-gear', route: '/patient/settings' },
  ];

  get user() {
    return this.authService.currentUser();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  ngOnInit(): void {
    this.mobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
    this.refreshUserProfile();
    this.loadCounts();
    this.loadNotifications();
    this.setupPolling();
    this.setupRealtimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.websocketService.disconnect();
  }

  private loadCounts(): void {
    this.messageService.getUnreadCount().subscribe({
      next: (res) => this.unreadMessages.set(res.count || 0),
      error: () => this.unreadMessages.set(0),
    });

    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotifications.set(count || 0),
      error: () => this.unreadNotifications.set(0),
    });
  }

  private refreshUserProfile(): void {
    this.authService.refreshProfile().subscribe({
      error: () => {
        // ignore profile refresh failures
      },
    });
  }

  loadNotifications(): void {
    this.isLoadingNotifications.set(true);
    this.notificationService.getNotifications(1, 5).subscribe({
      next: (response) => {
        const list = response.notifications || [];
        this.notifications.set(list);
        const unread = list.filter((item) => !item.read).length;
        this.unreadNotifications.set(unread);
        this.isLoadingNotifications.set(false);
      },
      error: () => {
        this.notifications.set([]);
        this.unreadNotifications.set(0);
        this.isLoadingNotifications.set(false);
      },
    });
  }

  loadConversations(): void {
    this.isLoadingMessages.set(true);
    this.messageService.getConversations().subscribe({
      next: (convs) => {
        this.conversations.set(convs.slice(0, 5));
        this.isLoadingMessages.set(false);
      },
      error: () => {
        this.conversations.set([]);
        this.isLoadingMessages.set(false);
      },
    });
  }

  private setupPolling(): void {
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadCounts();
        if (this.notificationsOpen()) {
          this.loadNotifications();
        }
        if (this.messagesOpen()) {
          this.loadConversations();
        }
      });
  }

  private setupRealtimeUpdates(): void {
    this.websocketService.connectMessages();
    this.websocketService.connectNotifications();

    this.websocketService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadCounts();
        if (this.messagesOpen()) this.loadConversations();
      });

    this.websocketService.conversationUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadCounts();
        if (this.messagesOpen()) this.loadConversations();
      });

    this.websocketService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event?.type === 'unreadCount' && typeof event.count === 'number') {
          this.unreadNotifications.set(event.count);
          return;
        }
        if (event?.type === 'notifications' && Array.isArray(event.notifications)) {
          this.notifications.set(event.notifications);
          const unread = event.notifications.filter((item: Notification) => !item.read).length;
          this.unreadNotifications.set(unread);
          return;
        }
        this.loadCounts();
        if (this.notificationsOpen()) {
          this.loadNotifications();
        }
      });
  }

  toggleNotifications(event?: MouseEvent): void {
    event?.stopPropagation();
    const next = !this.notificationsOpen();
    this.messagesOpen.set(false);
    this.notificationsOpen.set(next);
    if (next) {
      this.loadNotifications();
    }
  }

  toggleMessages(event?: MouseEvent): void {
    event?.stopPropagation();
    const next = !this.messagesOpen();
    this.notificationsOpen.set(false);
    this.messagesOpen.set(next);
    if (next) {
      this.loadConversations();
    }
  }

  closeDropdowns(): void {
    this.notificationsOpen.set(false);
    this.messagesOpen.set(false);
  }

  markNotificationRead(notification: Notification, event?: MouseEvent): void {
    event?.stopPropagation();
    if (notification.read) return;
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications.update((items) =>
          items.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
        );
        this.loadCounts();
      },
    });
  }

  markAllNotificationsRead(event?: MouseEvent): void {
    event?.stopPropagation();
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((items) => items.map((item) => ({ ...item, read: true })));
        this.unreadNotifications.set(0);
      },
    });
  }

  openNotification(notification: Notification, event?: MouseEvent): void {
    event?.stopPropagation();
    if (!notification.read) {
      this.markNotificationRead(notification);
    }
    const target = notification.actionUrl || this.getNotificationRoute(notification);
    if (target) {
      this.router.navigateByUrl(target);
    }
    this.closeDropdowns();
  }

  openConversation(conv: Conversation, event?: MouseEvent): void {
    event?.stopPropagation();
    this.router.navigate(['/patient/messages'], { queryParams: { id: conv.id } });
    this.closeDropdowns();
  }

  private getNotificationRoute(notification: Notification): string | null {
    switch (notification.type) {
      case 'appointment':
        return '/patient/appointments';
      case 'test_result':
        return '/patient/records';
      case 'prescription':
        return '/patient/records';
      case 'system':
        return '/patient/dashboard';
      default:
        return null;
    }
  }

  formatNotificationTime(date: Date | string): string {
    const value = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(value.getTime())) return '';
    const diffMs = Date.now() - value.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return value.toLocaleDateString();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeDropdowns();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.mobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
  }

  logout(): void {
    this.authService.logout();
  }
}
