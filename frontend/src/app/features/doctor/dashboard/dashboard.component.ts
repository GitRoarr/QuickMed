import { Component, OnInit, OnDestroy, signal, inject, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { DoctorService, DoctorDashboardData } from '@core/services/doctor.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterModule,
    DoctorSidebarComponent,
    DoctorHeaderComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private doctorService = inject(DoctorService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  themeService = inject(ThemeService);

  today = new Date();

  dashboardData = signal<DoctorDashboardData & { urgentAlerts?: { title: string; description: string }[] } | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  currentUser = signal<any>(null);
  unreadNotificationCount = signal(0);

  private notificationIntervalId: any;

  ngOnInit(): void {
    this.loadUserData();
    this.loadDashboardData();
    this.loadUnreadNotifications();
    this.startNotificationPolling();
  }

  ngOnDestroy(): void {
    if (this.notificationIntervalId) clearInterval(this.notificationIntervalId);
  }

  loadUserData(): void {
    this.currentUser.set(this.authService.currentUser());
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.doctorService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load dashboard data.');
        this.isLoading.set(false);
      }
    });
  }

  loadUnreadNotifications(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotificationCount.set(count || 0)
    });
  }

  private startNotificationPolling(): void {
    this.notificationIntervalId = setInterval(() => {
      this.loadUnreadNotifications();
    }, 30000);
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



  getInitials(name?: string): string {
    const n = (name || '').trim();
    if (!n) return 'P';
    const parts = n.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.substring(0, 2).toUpperCase();
  }
}