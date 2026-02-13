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
    const colors = ['var(--primary)', 'var(--success)', 'var(--warning)', 'var(--error)', 'var(--secondary)'];

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

  getSatisfactionLinePath(width: number, height: number): string {
    const data = this.analytics()?.satisfactionTrend;
    if (!data || data.length === 0) return '';

    const max = 100; // Satisfaction is 0-100
    const min = 0;

    // X spacing
    const stepX = width / (data.length - 1 || 1);

    const points = data.map((val, index) => {
      const x = index * stepX;
      // Invert Y because SVG 0 is top
      const y = height - ((val - min) / (max - min)) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
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

  getMaxChartValue(): number {
    const trendData = this.getAppointmentTrendData();
    const allValues = [...trendData.completed, ...trendData.cancelled, ...trendData.noShow];
    // Stacked bar? If stacked, we need max of sums.
    // The current UI seemed to be side-by-side or stacked? Code in template was doing separate bars in one column?
    // Let's verify template logic. It was Side-by-side (flex-col inside a flex-row container per month).
    // Wait, previous template had:
    // <div class="flex-1 flex flex-col justify-end gap-1 h-full"> ... divs ... </div>
    // This stacks them vertically? No, `flex-col` stacks them vertical. `justify-end`.
    // So it's a stacked bar chart! 
    // If it's a stacked bar chart, the max value should be the max of the SUMs.
    // Let's check `getBarHeight`. Currently it compares individual value to `getMaxChartValue`.
    // If they are stacked, the height of each segment is `(value / max) * 100`.
    // If total height is 100%, then sum of segments should be <= 100%.
    // So `maxValue` MUST be the max total (completed + cancelled + noShow).

    const maxFunction = () => {
      const sums = trendData.months.map((_, i) =>
        (trendData.completed[i] || 0) + (trendData.cancelled[i] || 0) + (trendData.noShow[i] || 0)
      );
      return Math.max(...sums, 1);
    };
    return maxFunction();
  }

  getBarHeight(value: number, maxValue: number): number {
    // Return percentage of TOTAL height
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