import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  PatientDashboardAppointment,
  PatientDashboardData,
  PatientPortalService,
} from '@core/services/patient-portal.service';
import { PatientShellComponent } from '../shared/patient-shell/patient-shell.component';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PatientShellComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  themeService = inject(ThemeService);
    get isDarkMode() {
      return this.themeService.isDarkMode();
    }
  private readonly patientPortalService = inject(PatientPortalService);

  isLoading = signal(true);
  dashboard = signal<PatientDashboardData | null>(null);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.patientPortalService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load dashboard', error);
        this.isLoading.set(false);
      },
    });
  }

  getVitalsCards() {
    const vitals = this.dashboard()?.vitals;
    if (!vitals) {
      return [];
    }
    const bpValue = vitals.bloodPressure.systolic && vitals.bloodPressure.diastolic
      ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`
      : '—';
    const heart = vitals.heartRate ?? null;
    const bmi = vitals.bmi ?? null;

    return [
      {
        label: 'Blood Pressure',
        value: bpValue,
        status: bpValue !== '—' ? 'Normal' : 'Not recorded',
        icon: 'bi-activity',
      },
      {
        label: 'Heart Rate',
        value: heart !== null ? `${heart} BPM` : '—',
        status: heart !== null && (heart < 60 || heart > 100) ? 'Needs attention' : heart !== null ? 'Healthy' : 'Not recorded',
        icon: 'bi-heart-pulse',
      },
      {
        label: 'BMI',
        value: bmi !== null ? bmi.toFixed(1) : '—',
        status: bmi !== null ? (bmi >= 18.5 && bmi <= 24.9 ? 'Normal Weight' : 'Review') : 'Not recorded',
        icon: 'bi-person',
      },
      {
        label: 'Last Checkup',
        value: vitals.lastCheckupDate ? new Date(vitals.lastCheckupDate).toLocaleDateString() : '—',
        status: vitals.lastCheckupDate ? this.getCheckupStatus(vitals.lastCheckupDate) : 'Schedule soon',
        icon: 'bi-calendar-check',
      },
    ];
  }

  private getCheckupStatus(dateString: string): string {
    const days = this.daysSince(dateString);
    if (days < 30) return 'Up to date';
    if (days < 90) return 'Due soon';
    return 'Schedule visit';
  }

  private daysSince(dateString: string): number {
    const date = new Date(dateString);
    const today = new Date();
    const diff = today.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  getUpcomingAppointments(): PatientDashboardAppointment[] {
    return this.dashboard()?.upcomingAppointments ?? [];
  }

  getPrescriptions() {
    return this.dashboard()?.prescriptions ?? [];
  }

  getLabResults() {
    return this.dashboard()?.labResults ?? [];
  }

  getStatsCards() {
    const stats = this.dashboard()?.stats;
    const quick = this.dashboard()?.quickStats;
    if (!stats) return [];

    if (quick) {
      return [
        { label: 'Upcoming', value: quick.upcoming, icon: 'bi-calendar-event' },
        { label: 'Active Meds', value: quick.activeMeds, icon: 'bi-capsule-pill' },
        { label: 'Records', value: quick.records, icon: 'bi-file-medical' },
        { label: 'Test Results', value: quick.testResults, icon: 'bi-activity' },
      ];
    }

    return [
      { label: 'Total Appointments', value: stats.totalAppointments, icon: 'bi-calendar4-week' },
      { label: 'Confirmed Visits', value: stats.confirmed, icon: 'bi-check2-circle' },
      { label: 'Video Visits', value: stats.videoVisits, icon: 'bi-camera-video' },
      { label: 'In-person Visits', value: stats.inPersonVisits, icon: 'bi-geo-alt' },
    ];
  }
}
