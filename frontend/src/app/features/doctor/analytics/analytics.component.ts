import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { DoctorService, DoctorAnalytics } from '@core/services/doctor.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-doctor-analytics',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterModule,
    DoctorHeaderComponent
  ],
  templateUrl: './analytics.component.html',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(40px)' }),
        animate('700ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AnalyticsComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  themeService = inject(ThemeService);

  analytics = signal<DoctorAnalytics | null>(null);
  isLoading = signal(true);
  selectedPeriod = signal('6months');
  currentUser = signal<any>(null);
  unreadNotificationCount = signal(0);
  themeMode = signal<'light' | 'dark'>(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  periodOptions = [
    { value: '7days', label: '7 Days' },
    { value: '30days', label: '30 Days' },
    { value: '6months', label: '6 Months' },
    { value: '1year', label: '1 Year' },
  ];

  ngOnInit(): void {
    this.loadUserData();
    this.loadAnalytics();
    this.loadUnreadNotifications();
  }

  loadUserData(): void {
    this.currentUser.set(this.authService.currentUser());
  }

  setTheme(mode: 'light' | 'dark'): void {
    this.themeMode.set(mode);
    document.documentElement.classList.toggle('dark', mode === 'dark');
    if (mode === 'dark') {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
    try {
      localStorage.setItem('theme', mode);
    } catch {}
  }

  loadAnalytics(): void {
    this.isLoading.set(true);
    this.doctorService.getAnalytics(this.selectedPeriod()).subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadUnreadNotifications(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotificationCount.set(count || 0)
    });
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod.set(period);
    this.loadAnalytics();
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

  getAppointmentTrendData() {
    const data = this.analytics();
    if (!data) return { months: [], completed: [], cancelled: [], noShow: [] };

    const months = Object.keys(data.appointmentTrends).sort();
    return {
      months: months.map(m => {
        const date = new Date(m + '-01');
        return date.toLocaleDateString('en-US', { month: 'short' });
      }),
      completed: months.map(m => data.appointmentTrends[m]?.completed || 0),
      cancelled: months.map(m => data.appointmentTrends[m]?.cancelled || 0),
      noShow: months.map(m => data.appointmentTrends[m]?.noShow || 0),
    };
  }

  getMaxChartValue(): number {
    const trendData = this.getAppointmentTrendData();
    const allValues = [...trendData.completed, ...trendData.cancelled, ...trendData.noShow];
    return allValues.length ? Math.max(...allValues, 1) : 1;
  }

  getBarHeight(value: number, maxValue: number): number {
    return maxValue === 0 ? 0 : (value / maxValue) * 100;
  }

  getCompletedValue(index: number): number {
    return this.getAppointmentTrendData().completed[index] || 0;
  }

  getCancelledValue(index: number): number {
    return this.getAppointmentTrendData().cancelled[index] || 0;
  }

  getNoShowValue(index: number): number {
    return this.getAppointmentTrendData().noShow[index] || 0;
  }
  
}