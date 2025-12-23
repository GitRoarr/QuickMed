import { Component, OnInit, OnDestroy, signal, inject, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DoctorService, DoctorDashboardData } from '@core/services/doctor.service';
import { AuthService } from '@core/services/auth.service';
import { AppointmentService } from '@core/services/appointment.service';
import { MessageService } from '@core/services/message.service';
import { NotificationService } from '@core/services/notification.service';
import { Notification } from '@core/models/notification.model';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private doctorService = inject(DoctorService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);
  notificationService = inject(NotificationService);

  dashboardData = signal<DoctorDashboardData | null>(null);
  isLoading = signal(true);
  currentUser = signal<any>(null);

  menuItems = signal<MenuItem[]>([]);
  appointmentBadgeCount = signal(0);
  messageBadgeCount = signal(0);

  notifications = signal<Notification[]>([]);
  unreadNotificationCount = signal(0);
  showNotificationDropdown = signal(false);
  isLoadingNotifications = signal(false);
  private notificationIntervalId: any;

  ngOnInit(): void {
    this.loadUserData();
    this.loadDashboardData();
    this.loadBadgeCounts();
    this.updateMenuItems();
    this.loadUnreadNotifications();
    this.startNotificationPolling();
  }

  ngOnDestroy(): void {
    if (this.notificationIntervalId) {
      clearInterval(this.notificationIntervalId);
    }
  }

  loadBadgeCounts(): void {
    this.appointmentService.getPendingCount().subscribe({
      next: (data) => {
        this.appointmentBadgeCount.set(data.count || 0);
        this.updateMenuItems();
      }
    });

    this.messageService.getUnreadCount().subscribe({
      next: (data) => {
        this.messageBadgeCount.set(data.count || 0);
        this.updateMenuItems();
      }
    });
  }

  loadUnreadNotifications(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotificationCount.set(count || 0),
      error: (error) => console.error('Error loading unread notifications:', error)
    });
  }

  loadNotifications(): void {
    this.isLoadingNotifications.set(true);
    this.notificationService.getNotifications(1, 10).subscribe({
      next: (response) => {
        this.notifications.set(response.notifications.slice(0, 10));
        this.isLoadingNotifications.set(false);
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.isLoadingNotifications.set(false);
      }
    });
  }

  toggleNotificationDropdown(): void {
    this.showNotificationDropdown.update((open) => !open);
    if (this.showNotificationDropdown()) {
      this.loadNotifications();
      this.loadUnreadNotifications();
    }
  }

  markNotificationAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        this.loadNotifications();
        this.loadUnreadNotifications();
      },
      error: (error) => console.error('Error marking notification as read:', error)
    });
  }

  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.loadNotifications();
        this.loadUnreadNotifications();
      },
      error: (error) => console.error('Error marking all notifications as read:', error)
    });
  }

  private startNotificationPolling(): void {
    this.notificationIntervalId = setInterval(() => {
      this.loadUnreadNotifications();
    }, 30000);
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-toggle') && !target.closest('.notification-dropdown')) {
      this.showNotificationDropdown.set(false);
    }
  }

  updateMenuItems(): void {
    this.menuItems.set([
      { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
      { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: this.appointmentBadgeCount() },
      { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
      { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
      { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/doctor/records' },
      { label: 'Prescriptions', icon: 'bi-prescription2', route: '/doctor/prescriptions' },
      { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: this.messageBadgeCount() },
      { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
      { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
    ]);
  }

  loadUserData(): void {
    const user = this.authService.currentUser();
    this.currentUser.set(user);
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.doctorService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading dashboard:', error);
        this.isLoading.set(false);
      }
    });
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

  getChartData() {
    const data = this.dashboardData();
    if (!data) return { labels: [], completed: [], pending: [] };

    const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
    return {
      labels: timeSlots.map(t => {
        const [hours, minutes] = t.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      }),
      completed: timeSlots.map(slot => data.appointmentsByTime[slot]?.completed || 0),
      pending: timeSlots.map(slot => data.appointmentsByTime[slot]?.pending || 0),
    };
  }

  getMaxChartValue(): number {
    const chartData = this.getChartData();
    const allValues = [...chartData.completed, ...chartData.pending];
    if (!allValues || allValues.length === 0) return 1;
    return Math.max(...allValues, 1);
  }

  getBarHeight(value: number, maxValue: number): number {
    if (!maxValue || maxValue === 0) return 0;
    return (value / maxValue) * 100;
  }

  getCompletedValue(index: number): number {
    const chartData = this.getChartData();
    return chartData.completed[index] || 0;
  }

  getPendingValue(index: number): number {
    const chartData = this.getChartData();
    return chartData.pending[index] || 0;
  }

  abs(value: number): number {
    return Math.abs(value);
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
