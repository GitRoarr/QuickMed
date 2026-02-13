import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

import { RouterModule } from '@angular/router';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { ThemeService } from '@core/services/theme.service';
import { AuthService } from '@core/services/auth.service';
import { PrescriptionService, Prescription, PrescriptionStats } from '@core/services/prescription.service';
import { DoctorService } from '@core/services/doctor.service';
import { NotificationService } from '@core/services/notification.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-doctor-prescriptions',
  standalone: true,
  imports: [CommonModule, DatePipe, TitleCasePipe, FormsModule, DoctorHeaderComponent, RouterModule],
  templateUrl: './prescriptions.component.html',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('modalScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('200ms cubic-bezier(0, 0, 0.2, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms cubic-bezier(0.4, 0, 1, 1)', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ]),
    trigger('backdropFade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
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

  // Stats from backend
  stats = signal<PrescriptionStats>({
    total: 0, activeCount: 0, completedCount: 0, cancelledCount: 0, thisWeekCount: 0, thisMonthCount: 0
  });

  // Detail modal
  showDetailModal = signal(false);
  selectedPrescription = signal<Prescription | null>(null);

  statusFilters = [
    { label: 'All', value: 'all' as const, icon: 'bi-grid' },
    { label: 'Active', value: 'active' as const, icon: 'bi-check-circle' },
    { label: 'Completed', value: 'completed' as const, icon: 'bi-check2-all' },
    { label: 'Cancelled', value: 'cancelled' as const, icon: 'bi-x-circle' },
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
    this.loadStats();
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

  loadStats(): void {
    this.service.getStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => { }
    });
  }

  onSearchChange(): void {
    this.load();
  }

  setStatusFilter(filter: 'all' | 'active' | 'completed' | 'cancelled'): void {
    this.activeFilter.set(filter);
  }

  // Detail modal
  openDetailModal(p: Prescription): void {
    this.selectedPrescription.set(p);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedPrescription.set(null);
  }

  // Status management
  markCompleted(p: Prescription): void {
    this.service.updateStatus(p.id, 'completed').subscribe({
      next: () => {
        this.toast.success('Prescription marked as completed');
        this.load();
        this.loadStats();
        if (this.selectedPrescription()?.id === p.id) {
          this.selectedPrescription.set({ ...p, status: 'completed' });
        }
      },
      error: () => this.toast.error('Failed to update prescription')
    });
  }

  cancelPrescription(p: Prescription): void {
    if (!confirm('Are you sure you want to cancel this prescription?')) return;
    this.service.updateStatus(p.id, 'cancelled').subscribe({
      next: () => {
        this.toast.success('Prescription cancelled');
        this.load();
        this.loadStats();
      },
      error: () => this.toast.error('Failed to cancel prescription')
    });
  }

  reactivatePrescription(p: Prescription): void {
    this.service.updateStatus(p.id, 'active').subscribe({
      next: () => {
        this.toast.success('Prescription reactivated');
        this.load();
        this.loadStats();
      },
      error: () => this.toast.error('Failed to reactivate prescription')
    });
  }

  deletePrescription(p: Prescription): void {
    if (!confirm('Are you sure you want to permanently delete this prescription?')) return;
    this.service.delete(p.id).subscribe({
      next: () => {
        this.toast.success('Prescription deleted');
        this.load();
        this.loadStats();
        if (this.showDetailModal()) this.closeDetailModal();
      },
      error: () => this.toast.error('Failed to delete prescription')
    });
  }

  getPatientName(p: Prescription): string {
    return p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : 'Unknown';
  }

  getPatientInitials(name: string): string {
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  getDoctorInitials(): string {
    const u = this.currentUser();
    return u ? (u.firstName[0] + u.lastName[0]).toUpperCase() : 'DR';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: 'emerald', completed: 'emerald', cancelled: 'gray'
    };
    return colors[status] || 'gray';
  }

  trackById(index: number, item: Prescription): string {
    return item.id;
  }
}
