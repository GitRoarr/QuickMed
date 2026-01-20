import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminShellComponent } from '../shared/admin-shell';
import { AdminService } from '../../../core/services/admin.service';
import { ConsultationsService, ConsultationStats } from '../../../core/services/consultations.service';
import { ThemeService } from '@core/services/theme.service';

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
  imports: [CommonModule, FormsModule, AdminShellComponent, DatePipe],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {

  analytics = signal<AnalyticsData | null>(null);
  isLoading = signal(false);
  consultationStats = signal<ConsultationStats | null>(null);
  startDate = signal(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  endDate = signal(new Date().toISOString().split('T')[0]);

  constructor(private adminService: AdminService, private consultationsService: ConsultationsService) {}

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.isLoading.set(true);
    const start = this.startDate();
    const end = this.endDate();
    
    this.adminService.getAnalytics(start, end).subscribe({
      next: (data) => {
        // Handle error response from backend
        if (data?.error) {
          console.warn('Analytics warning:', data.error);
          // Set empty data structure
          this.analytics.set({
            appointmentsByDate: {},
            statusDistribution: { pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
            doctorStats: [],
            patientsByDate: [],
            revenueByDate: {},
            totalRevenue: 0,
            period: { start, end },
          });
        } else {
          this.analytics.set(data);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        // Set empty data on error
        this.analytics.set({
          appointmentsByDate: {},
          statusDistribution: { pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
          doctorStats: [],
          patientsByDate: [],
          revenueByDate: {},
          totalRevenue: 0,
          period: { start, end },
        });
        this.isLoading.set(false);
      }
    });

    // Load consultation stats in parallel
    this.consultationsService.getStats(start, end).subscribe({
      next: (stats) => this.consultationStats.set(stats),
      error: (err) => {
        console.warn('Consultation stats unavailable', err);
        this.consultationStats.set({
          averageConsultationMinutes: 0,
          satisfactionRate: 0,
          reviewsCount: 0,
          sampleSize: 0,
          period: { start, end },
        });
      }
    })
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
