import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from '@core/services/admin.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationCenterComponent } from '@app/shared/components/notification-center/notification-center.component';

interface AdminStats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalAdmins: number;
  totalAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  todayAppointments: number;
  thisWeekAppointments: number;
  thisMonthAppointments: number;
  revenue: number;
  averageAppointmentDuration: number;
  patientSatisfactionScore: number;
}

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  notifications: 'healthy' | 'warning' | 'error';
}

interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, NotificationCenterComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  isLoading = signal(true);
  stats = signal<AdminStats | null>(null);
  systemHealth = signal<SystemHealth | null>(null);
  notifications = signal<Notification[]>([]);
  recentAppointments = signal<any[]>([]);
  recentUsers = signal<any[]>([]);
  upcomingAppointments = signal<any[]>([]);
  
  currentUser = this.authService.currentUser;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    try {
      this.isLoading.set(true);
      
      // Load dashboard data
      const dashboardData = await this.adminService.getDashboardData().toPromise();
      
      if (dashboardData) {
        this.stats.set(dashboardData.stats);
        this.systemHealth.set(dashboardData.systemHealth);
        this.notifications.set(dashboardData.notifications);
        this.recentAppointments.set(dashboardData.recentAppointments);
        this.recentUsers.set(dashboardData.recentUsers);
        this.upcomingAppointments.set(dashboardData.upcomingAppointments);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  getHealthStatusClass(status: string): string {
    switch (status) {
      case 'healthy':
        return 'status-healthy';
      case 'warning':
        return 'status-warning';
      case 'error':
        return 'status-error';
      default:
        return 'status-unknown';
    }
  }

  getHealthIcon(status: string): string {
    switch (status) {
      case 'healthy':
        return 'bi-check-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'error':
        return 'bi-x-circle-fill';
      default:
        return 'bi-question-circle-fill';
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'info':
        return 'bi-info-circle-fill';
      case 'success':
        return 'bi-check-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'error':
        return 'bi-x-circle-fill';
      default:
        return 'bi-bell-fill';
    }
  }

  getNotificationClass(type: string): string {
    switch (type) {
      case 'info':
        return 'notification-info';
      case 'success':
        return 'notification-success';
      case 'warning':
        return 'notification-warning';
      case 'error':
        return 'notification-error';
      default:
        return 'notification-default';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(date: Date | string): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  navigateToUsers(): void {
    this.router.navigate(['/admin/users']);
  }

  navigateToAppointments(): void {
    this.router.navigate(['/admin/appointments']);
  }

  navigateToReports(): void {
    this.router.navigate(['/admin/reports']);
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  markNotificationAsRead(notificationId: number): void {
    const notifications = this.notifications();
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.notifications.set([...notifications]);
    }
  }

  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName || !lastName) return 'A';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  }

  getAppointmentStatusClass(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed';
      case 'pending':
        return 'status-pending';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  }

  getAppointmentStatusIcon(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'bi-check-circle';
      case 'pending':
        return 'bi-clock';
      case 'completed':
        return 'bi-check2-all';
      case 'cancelled':
        return 'bi-x-circle';
      default:
        return 'bi-question-circle';
    }
  }

  getUserRoleClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'role-admin';
      case 'doctor':
        return 'role-doctor';
      case 'patient':
        return 'role-patient';
      default:
        return 'role-default';
    }
  }

  getUserRoleIcon(role: string): string {
    switch (role) {
      case 'admin':
        return 'bi-shield-check';
      case 'doctor':
        return 'bi-person-badge';
      case 'patient':
        return 'bi-person';
      default:
        return 'bi-person-circle';
    }
  }
}