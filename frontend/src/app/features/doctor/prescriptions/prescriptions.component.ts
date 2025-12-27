import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';

import { AuthService } from '@core/services/auth.service';
import { PrescriptionService, Prescription } from '@core/services/prescription.service';
import { NotificationService } from '@core/services/notification.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-doctor-prescriptions',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterModule,
    DoctorHeaderComponent,
    DoctorSidebarComponent
  ],
  templateUrl: './prescriptions.component.html',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(24px)' }),
        animate('600ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class PrescriptionsComponent implements OnInit {

  private authService = inject(AuthService);
  private prescriptionService = inject(PrescriptionService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  themeService = inject(ThemeService);

  prescriptions = signal<Prescription[]>([]);
  filteredPrescriptions = signal<Prescription[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  currentUser = signal<any>(null);
  unreadNotificationCount = signal(0);

  skeletons = Array(6);

  ngOnInit(): void {
    this.currentUser.set(this.authService.currentUser());
    this.loadPrescriptions();
    this.notificationService.getUnreadCount().subscribe(c =>
      this.unreadNotificationCount.set(c || 0)
    );
  }

  loadPrescriptions(): void {
    this.isLoading.set(true);
    this.prescriptionService.getAll(this.searchQuery() || undefined).subscribe({
      next: data => {
        this.prescriptions.set(data);
        this.filteredPrescriptions.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSearchChange(): void {
    this.loadPrescriptions();
  }

  getPatientName(p: Prescription): string {
    return p.patient
      ? `${p.patient.firstName} ${p.patient.lastName}`
      : 'Unknown Patient';
  }

  getDoctorInitials(): string {
    const u = this.currentUser();
    if (!u) return 'DR';
    return (u.firstName[0] + u.lastName[0]).toUpperCase();
  }

  getStatusBg(status: string): string {
    if (status === 'active') return 'var(--success-light)';
    if (status === 'completed') return 'var(--info-light)';
    if (status === 'cancelled') return 'var(--error-light)';
    return 'var(--surface-secondary)';
  }

  getStatusText(status: string): string {
    if (status === 'active') return 'var(--success)';
    if (status === 'completed') return 'var(--info)';
    if (status === 'cancelled') return 'var(--error)';
    return 'var(--text-secondary)';
  }

  viewPrescription(p: Prescription): void {
    console.log(p);
  }

  downloadPrescription(p: Prescription): void {
    console.log(p);
  }

  createNewPrescription(): void {
    this.router.navigate(['/doctor/prescriptions/create']);
  }

  onThemeChange(mode: 'light' | 'dark'): void {
    const isDark = this.themeService.isDarkMode();
    if (mode === 'dark' && !isDark) this.themeService.toggleTheme();
    if (mode === 'light' && isDark) this.themeService.toggleTheme();
  }
}
