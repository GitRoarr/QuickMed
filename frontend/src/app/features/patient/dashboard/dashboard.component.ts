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
    return [
      {
        label: 'Blood Pressure',
        value: `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`,
        status: 'Normal',
        icon: 'bi-activity',
      },
      {
        label: 'Heart Rate',
        value: `${vitals.heartRate} BPM`,
        status: vitals.heartRate < 60 || vitals.heartRate > 100 ? 'Needs attention' : 'Healthy',
        icon: 'bi-heart-pulse',
      },
      {
        label: 'BMI',
        value: vitals.bmi.toFixed(1),
        status: vitals.bmi >= 18.5 && vitals.bmi <= 24.9 ? 'Normal Weight' : 'Review',
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
    if (!stats) return [];
    return [
      {
        label: 'Total Appointments',
        value: stats.totalAppointments,
        icon: 'bi-calendar4-week',
      },
      {
        label: 'Confirmed Visits',
        value: stats.confirmed,
        icon: 'bi-check2-circle',
      },
      {
        label: 'Video Visits',
        value: stats.videoVisits,
        icon: 'bi-camera-video',
      },
      {
        label: 'In-person Visits',
        value: stats.inPersonVisits,
        icon: 'bi-geo-alt',
      },
    ];
  }
}
