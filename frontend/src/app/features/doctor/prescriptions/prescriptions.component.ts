import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { ThemeService } from '@core/services/theme.service';
import { AuthService } from '@core/services/auth.service';
import { PrescriptionService, Prescription } from '@core/services/prescription.service';
import { NotificationService } from '@core/services/notification.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-doctor-prescriptions',
  standalone: true,
  imports: [CommonModule, DatePipe, TitleCasePipe, DoctorHeaderComponent],
  templateUrl: './prescriptions.component.html',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class PrescriptionsComponent implements OnInit {

  themeService = inject(ThemeService);
  private auth = inject(AuthService);
  private service = inject(PrescriptionService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private toast = inject(ToastService);

  prescriptions = signal<Prescription[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  activeFilter = signal<'all' | 'active' | 'completed' | 'cancelled'>('all');
  currentUser = signal<any>(null);
  unreadNotificationCount = signal(0);

  statusFilters = [
    { label: 'All', value: 'all' as const },
    { label: 'Active', value: 'active' as const },
    { label: 'Completed', value: 'completed' as const },
    { label: 'Cancelled', value: 'cancelled' as const },
  ];

  filteredPrescriptions = computed(() => {
    let list = this.prescriptions();
    const filter = this.activeFilter();
    if (filter !== 'all') {
      list = list.filter(p => p.status === filter);
    }
    return list;
  });

  ngOnInit(): void {
    this.currentUser.set(this.auth.currentUser());
    this.load();
    this.notify.getUnreadCount().subscribe(c => this.unreadNotificationCount.set(c || 0));
  }

  load(): void {
    this.isLoading.set(true);
    this.service.getAll(this.searchQuery() || undefined).subscribe({
      next: d => {
        this.prescriptions.set(d);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load prescriptions');
      }
    });
  }

  onSearchChange(): void {
    this.load();
  }

  setStatusFilter(filter: 'all' | 'active' | 'completed' | 'cancelled'): void {
    this.activeFilter.set(filter);
  }

  getActiveCount(): number {
    return this.prescriptions().filter(p => p.status === 'active').length;
  }

  getCompletedCount(): number {
    return this.prescriptions().filter(p => p.status === 'completed').length;
  }

  getThisWeekCount(): number {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.prescriptions().filter(p => {
      const date = new Date(p.prescriptionDate);
      return date >= weekAgo && date <= now;
    }).length;
  }

  getPatientName(p: Prescription): string {
    return p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : 'Unknown';
  }

  getDoctorInitials(): string {
    const u = this.currentUser();
    return u ? (u.firstName[0] + u.lastName[0]).toUpperCase() : 'DR';
  }

  createNewPrescription(): void {
    this.router.navigate(['/doctor/prescriptions/create']);
  }

  viewPrescription(p: Prescription): void {
    this.toast.info(`Viewing prescription: ${p.medication}`);
    // Could navigate to detail page: this.router.navigate(['/doctor/prescriptions', p.id]);
  }

  downloadPrescription(p: Prescription): void {
    this.toast.success(`Downloading prescription for ${p.medication}`);
    // Implement actual download logic here
  }

  trackById(index: number, item: Prescription): string {
    return item.id;
  }
}
