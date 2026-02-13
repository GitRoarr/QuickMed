import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';
import { NotificationService } from '@core/services/notification.service';
import { MessageService } from '@core/services/message.service';
import { Notification } from '@core/models/notification.model';

@Component({
  selector: 'app-doctor-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './doctor-header.component.html',
  styleUrls: ['./doctor-header.component.css']
})
export class DoctorHeaderComponent implements OnInit {
  private router = inject(Router);
  themeService = inject(ThemeService);
  private notificationService = inject(NotificationService);
  private messageService = inject(MessageService);

  // Inputs
  @Input() initials: string = 'DR';
  @Input() avatarUrl?: string | null;
  @Input() unreadNotifications: number = 0;

  unreadMessages = signal(0);
  showNotificationPanel = signal(false);
  showMessagePanel = signal(false);
  recentNotifications = signal<Notification[]>([]);
  isLoadingNotifications = signal(false);

  notificationTypes = [
    { type: 'appointment', label: 'New Appointments', count: 0, icon: 'bi-calendar-event', color: 'blue' },
    { type: 'message', label: 'Patient Messages', count: 0, icon: 'bi-chat-dots', color: 'emerald' },
    { type: 'lab', label: 'Lab Results', count: 0, icon: 'bi-clipboard2-pulse', color: 'purple' },
    { type: 'prescription', label: 'Prescription Requests', count: 0, icon: 'bi-capsule', color: 'orange' },
    { type: 'reminder', label: 'Reminders', count: 0, icon: 'bi-alarm', color: 'cyan' },
    { type: 'emergency', label: 'Emergency Alerts', count: 0, icon: 'bi-exclamation-triangle-fill', color: 'red' },
  ];

  ngOnInit(): void {
    this.loadNotificationCounts();
    this.loadUnreadMessages();
  }

  loadNotificationCounts() {
    this.isLoadingNotifications.set(true);
    this.notificationService.getNotifications(1, 50).subscribe({
      next: ({ notifications }) => {
        // Reset counts
        this.notificationTypes.forEach(t => t.count = 0);
        notifications.forEach(n => {
          if (n.type === 'appointment') this.notificationTypes[0].count++;
          else if (n.type === 'message') this.notificationTypes[1].count++;
          else if (n.type === 'test_result' || n.type === 'lab') this.notificationTypes[2].count++;
          else if (n.type === 'prescription') this.notificationTypes[3].count++;
          else if (n.type === 'reminder') this.notificationTypes[4].count++;
          else if (n.type === 'error' || n.type === 'warning') this.notificationTypes[5].count++;
        });
        // Update unreadNotifications for badge
        this.unreadNotifications = notifications.filter(n => !n.read).length;
        this.recentNotifications.set(
          notifications
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
        this.isLoadingNotifications.set(false);
      },
      error: () => {
        this.isLoadingNotifications.set(false);
      }
    });
  }

  loadUnreadMessages() {
    this.messageService.getUnreadCount().subscribe({
      next: (res) => {
        this.unreadMessages.set(res.count || 0);
      },
      error: () => { }
    });
  }

  toggleNotificationPanel() {
    this.showMessagePanel.set(false);
    this.showNotificationPanel.update(v => !v);
  }

  toggleMessagePanel() {
    this.showNotificationPanel.set(false);
    this.showMessagePanel.update(v => !v);
  }

  closePanels() {
    this.showNotificationPanel.set(false);
    this.showMessagePanel.set(false);
  }

  markAllRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.unreadNotifications = 0;
        this.recentNotifications.update(list =>
          list.map(n => ({ ...n, read: true }))
        );
      }
    });
  }

  markNotificationRead(notification: Notification) {
    if (notification.read) return;
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        this.recentNotifications.update(list =>
          list.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        this.unreadNotifications = Math.max(0, this.unreadNotifications - 1);
      }
    });
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      appointment: 'bi-calendar-event',
      message: 'bi-chat-dots',
      test_result: 'bi-clipboard2-pulse',
      lab: 'bi-clipboard2-pulse',
      prescription: 'bi-capsule',
      reminder: 'bi-alarm',
      error: 'bi-exclamation-triangle-fill',
      warning: 'bi-exclamation-triangle',
      info: 'bi-info-circle',
      system: 'bi-gear',
    };
    return icons[type] || 'bi-bell';
  }

  getNotificationColor(type: string): string {
    const colors: Record<string, string> = {
      appointment: 'text-blue-600',
      message: 'text-emerald-600',
      test_result: 'text-purple-600',
      lab: 'text-purple-600',
      prescription: 'text-orange-600',
      reminder: 'text-cyan-600',
      error: 'text-red-600',
      warning: 'text-amber-600',
    };
    return colors[type] || 'text-gray-600';
  }

  formatTimeAgo(dateStr: string | Date): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  get theme(): 'light' | 'dark' {
    return this.themeService.isDarkMode() ? 'dark' : 'light';
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  goTo(route: string) {
    this.closePanels();
    this.router.navigate([route]);
  }
}
