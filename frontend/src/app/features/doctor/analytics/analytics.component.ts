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
  styleUrls: ['./analytics.component.css'],
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

  getDonutSegments() {
    const data = this.analytics();
    if (!data || !data.appointmentTypeBreakdown) return [];

    const total = data.appointmentTypeBreakdown.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return [];

    let cumPercent = 0;
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

    return data.appointmentTypeBreakdown.map((item, index) => {
      const percentage = item.count / total;
      const dashArray = `${percentage * 100} ${100 - percentage * 100}`;
      const offset = 25 - cumPercent * 100; // Start at top (25%)
      cumPercent += percentage;

      return {
        label: item.type,
        count: item.count,
        color: colors[index % colors.length],
        dashArray: dashArray,
        offset: offset
      };
    });
  }

  getSatisfactionPoints(width: number, height: number): { x: number, y: number, val: number }[] {
    const data = this.analytics()?.satisfactionTrend;
    if (!data || data.length === 0) return [];

    const max = 100; // Satisfaction is 0-100
    const min = 0;

    // X spacing
    const stepX = width / (data.length - 1 || 1);

    return data.map((val, index) => {
      const x = index * stepX;
      // Invert Y because SVG 0 is top. Leave some padding.
      const padding = 20;
      const availableHeight = height - (padding * 2);
      const y = (height - padding) - ((val - min) / (max - min)) * availableHeight;
      return { x, y, val };
    });
  }

  getSatisfactionLinePath(width: number, height: number): string {
    const points = this.getSatisfactionPoints(width, height);
    if (points.length === 0) return '';

    if (points.length === 1) {
      return `M ${points[0].x},${points[0].y} L ${width},${points[0].y}`;
    }

    // Catmull-Rom to Bezier conversion for smooth curves
    const k = 1; // Tension
    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6 * k;
      const cp1y = p1.y + (p2.y - p0.y) / 6 * k;

      const cp2x = p2.x - (p3.x - p1.x) / 6 * k;
      const cp2y = p2.y - (p3.y - p1.y) / 6 * k;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    return path;
  }

  getReviewFillPath(width: number, height: number): string {
    const linePath = this.getSatisfactionLinePath(width, height);
    if (!linePath) return '';
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  }

  getAppointmentTrendData() {
    const data = this.analytics();
    if (!data) return { months: [], completed: [], cancelled: [], noShow: [] };

    // Sort keys chronologically
    const months = Object.keys(data.appointmentTrends).sort();

    return {
      months: months.map(m => {
        // If m is YYYY-MM
        if (m.length === 7) {
          const date = new Date(m + '-01');
          return date.toLocaleDateString('en-US', { month: 'short' });
        }
        // If m is YYYY-MM-DD
        const date = new Date(m);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      completed: months.map(m => data.appointmentTrends[m]?.completed || 0),
      cancelled: months.map(m => data.appointmentTrends[m]?.cancelled || 0),
      noShow: months.map(m => data.appointmentTrends[m]?.noShow || 0),
    };
  }

  getTrendPoints(category: 'completed' | 'cancelled' | 'noShow', width: number, height: number): { x: number, y: number, val: number, label: string }[] {
    const data = this.getAppointmentTrendData();
    const values = data[category];
    const months = data.months;

    if (!values || values.length === 0) return [];

    // Find global max across all categories for consistent scaling
    const maxVal = Math.max(
      ...data.completed,
      ...data.cancelled,
      ...data.noShow,
      1 // Avoid divide by zero
    );

    // Add 10% padding to top
    const scaleMax = maxVal * 1.1;
    const minVal = 0;

    const stepX = width / (values.length - 1 || 1);
    const padding = 20; // Bottom padding for labels space if needed, though usually handled outside
    // Actually inside SVG we usually want full height usage minus some padding
    const availableHeight = height - 40; // 20 top, 20 bottom

    return values.map((val, index) => {
      const x = index * stepX;
      // Y: 0 is top. 
      // val = 0 -> y = height - 20
      // val = max -> y = 20
      const y = (height - 20) - ((val / scaleMax) * availableHeight);
      return { x, y, val, label: months[index] };
    });
  }

  getTrendPath(category: 'completed' | 'cancelled' | 'noShow', width: number, height: number): string {
    const points = this.getTrendPoints(category, width, height);
    return this.pointsToPath(points);
  }

  getTrendAreaPath(category: 'completed' | 'cancelled' | 'noShow', width: number, height: number): string {
    const points = this.getTrendPoints(category, width, height);
    if (points.length === 0) return '';
    const linePath = this.pointsToPath(points);
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  }

  private pointsToPath(points: { x: number, y: number }[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x},${points[0].y} L ${points[0].x},${points[0].y}`;

    const k = 0.35; // Tension/Smoothing factor
    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) * k;
      const cp1y = p1.y + (p2.y - p0.y) * k;

      const cp2x = p2.x - (p3.x - p1.x) * k;
      const cp2y = p2.y - (p3.y - p1.y) * k;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  }

  getMaxChartValue(): number {
    const trendData = this.getAppointmentTrendData();
    // For line chart, we want the max occurring value
    return Math.max(
      ...trendData.completed,
      ...trendData.cancelled,
      ...trendData.noShow,
      1
    );
  }

}