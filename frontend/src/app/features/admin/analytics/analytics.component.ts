import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar';
import { HeaderComponent } from '../shared/header';
import { AdminService } from '../../../core/services/admin.service';
import { AdminThemeService } from '../../../core/services/admin-theme.service';

interface AnalyticsData {
  appointmentsByDate: { [key: string]: number };
  statusDistribution: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  doctorStats: Array<{
    doctorId: string;
    name: string;
    totalAppointments: number;
    completedCount: number;
    completionRate: string;
  }>;
  patientsByDate: Array<{ date: string; count: number }>;
  revenueByDate: { [key: string]: number };
  totalRevenue: number;
  period: { start: string; end: string };
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent, DatePipe],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {
  menuItems = [
    { label: 'Overview', icon: 'grid', route: '/admin/overview' },
    { label: 'Appointments', icon: 'calendar', route: '/admin/appointments' },
    { label: 'Patients', icon: 'people', route: '/admin/patients' },
    { label: 'Doctors', icon: 'stethoscope', route: '/admin/doctors' },
    { label: 'Receptionists', icon: 'headset', route: '/admin/receptionists' },
    { label: 'User Management', icon: 'person-gear', route: '/admin/users' },
    { label: 'Analytics', icon: 'bar-chart', route: '/admin/analytics' },
    { label: 'Settings', icon: 'gear', route: '/admin/settings' }
  ];

  analytics = signal<AnalyticsData | null>(null);
  isLoading = signal(false);
  startDate = signal(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  endDate = signal(new Date().toISOString().split('T')[0]);

  themeService = inject(AdminThemeService);

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.isLoading.set(true);
    const start = this.startDate();
    const end = this.endDate();
    
    this.adminService.getAnalytics(start, end).subscribe({
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

  onDateRangeChange() {
    this.loadAnalytics();
  }

  getChartData() {
    const data = this.analytics();
    if (!data) return { labels: [], values: [] };
    
    const sorted = Object.entries(data.appointmentsByDate).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      labels: sorted.map(([date]) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      values: sorted.map(([, count]) => count),
    };
  }

  getRevenueChartData() {
    const data = this.analytics();
    if (!data) return { labels: [], values: [] };
    
    const sorted = Object.entries(data.revenueByDate).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      labels: sorted.map(([date]) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      values: sorted.map(([, revenue]) => revenue),
    };
  }

  getMaxValue(values: number[]): number {
    if (!values || values.length === 0) return 1;
    return Math.max(...values);
  }

  getBarHeight(value: number, maxValue: number): number {
    if (!maxValue || maxValue === 0) return 0;
    return (value / maxValue) * 100;
  }

  getPatientGrowthMax(): number {
    const data = this.analytics();
    if (!data?.patientsByDate || data.patientsByDate.length === 0) return 1;
    const counts = data.patientsByDate.map(p => p.count);
    return Math.max(...counts);
  }

  getPatientGrowthWidth(itemCount: number): number {
    const max = this.getPatientGrowthMax();
    if (max === 0) return 0;
    return (itemCount / max) * 100;
  }
}
