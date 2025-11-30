import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { DoctorService, DoctorAnalytics } from '@core/services/doctor.service';
import { AppointmentService } from '@core/services/appointment.service';
import { MessageService } from '@core/services/message.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-doctor-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private doctorService = inject(DoctorService);
  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);

  analytics = signal<DoctorAnalytics | null>(null);
  isLoading = signal(true);
  selectedPeriod = signal('6months');
  currentUser = signal<any>(null);

  menuItems = signal<MenuItem[]>([]);

  periodOptions = [
    { value: '7days', label: '7 Days' },
    { value: '30days', label: '30 Days' },
    { value: '6months', label: '6 Months' },
    { value: '1year', label: '1 Year' },
  ];

  ngOnInit(): void {
    this.loadUserData();
    this.loadAnalytics();
    this.loadBadgeCounts();
  }

  loadBadgeCounts(): void {
    this.appointmentService.getPendingCount().subscribe({
      next: (data) => {
        this.updateMenuItems(data.count || 0, 0);
      }
    });

    this.messageService.getUnreadCount().subscribe({
      next: (data) => {
        this.appointmentService.getPendingCount().subscribe({
          next: (aptData) => {
            this.updateMenuItems(aptData.count || 0, data.count || 0);
          }
        });
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

  loadAnalytics(): void {
    this.isLoading.set(true);
    this.doctorService.getAnalytics(this.selectedPeriod()).subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.isLoading.set(false);
      }
    });
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod.set(period);
    this.loadAnalytics();
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
    if (!allValues || allValues.length === 0) return 1;
    return Math.max(...allValues, 1);
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

  getBarHeight(value: number, maxValue: number): number {
    if (!maxValue || maxValue === 0) return 0;
    return (value / maxValue) * 100;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
