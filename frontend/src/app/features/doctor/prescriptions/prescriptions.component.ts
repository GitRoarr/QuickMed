import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
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
    DoctorSidebarComponent,
    DoctorHeaderComponent
  ],
  templateUrl: './prescriptions.component.html',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
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

  ngOnInit(): void {
    this.loadUserData();
    this.loadPrescriptions();
    this.loadUnreadNotifications();
  }

  loadUserData(): void {
    this.currentUser.set(this.authService.currentUser());
  }

  loadPrescriptions(): void {
    this.isLoading.set(true);
    this.prescriptionService.getAll(this.searchQuery() || undefined).subscribe({
      next: (data) => {
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

  loadUnreadNotifications(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotificationCount.set(count || 0)
    });
  }

  getPatientName(p: Prescription): string {
    return p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : 'Unknown Patient';
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

  viewPrescription(prescription: Prescription): void {
    console.log('View prescription:', prescription);
  }

  downloadPrescription(prescription: Prescription): void {
    console.log('Download prescription:', prescription);
  }

  createNewPrescription(): void {
    this.router.navigate(['/doctor/prescriptions/create']);
  }

  onThemeChange(mode: 'light' | 'dark'): void {
    const isDark = this.themeService.isDarkMode();
    if (mode === 'dark' && !isDark) {
      this.themeService.toggleTheme();
    } else if (mode === 'light' && isDark) {
      this.themeService.toggleTheme();
    }
  }
}