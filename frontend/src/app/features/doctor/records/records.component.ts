import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { AuthService } from '@core/services/auth.service';
import { MedicalRecordService, MedicalRecord } from '@core/services/medical-record.service';
import { NotificationService } from '@core/services/notification.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-doctor-records',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TitleCasePipe,
    RouterModule,
    DoctorSidebarComponent,
    DoctorHeaderComponent
  ],
  templateUrl: './records.component.html',
})
export class RecordsComponent implements OnInit {
  private authService = inject(AuthService);
  private medicalRecordService = inject(MedicalRecordService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private toast = inject(ToastService);

  records = signal<MedicalRecord[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  activeFilter = signal<'all' | 'lab' | 'imaging' | 'prescription' | 'diagnosis' | 'other'>('all');
  currentUser = signal<any>(null);
  unreadNotificationCount = signal(0);

  typeFilters = [
    { label: 'All', value: 'all' as const },
    { label: 'Lab Reports', value: 'lab' as const },
    { label: 'Imaging', value: 'imaging' as const },
    { label: 'Prescriptions', value: 'prescription' as const },
    { label: 'Diagnosis', value: 'diagnosis' as const },
    { label: 'Other', value: 'other' as const },
  ];

  filteredRecords = computed(() => {
    let list = this.records();
    const filter = this.activeFilter();
    if (filter !== 'all') {
      list = list.filter(r => r.type === filter);
    }
    return list;
  });

  ngOnInit(): void {
    this.loadUserData();
    this.loadRecords();
    this.loadUnreadNotifications();
  }

  loadUserData(): void {
    this.currentUser.set(this.authService.currentUser());
  }

  loadRecords(): void {
    this.isLoading.set(true);
    this.medicalRecordService.getMyRecords(this.searchQuery() || undefined).subscribe({
      next: (data) => {
        this.records.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Failed to load medical records');
      }
    });
  }

  onSearchChange(): void {
    this.loadRecords();
  }

  setTypeFilter(filter: 'all' | 'lab' | 'imaging' | 'prescription' | 'diagnosis' | 'other'): void {
    this.activeFilter.set(filter);
  }

  loadUnreadNotifications(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotificationCount.set(count || 0)
    });
  }

  getCountByType(type: string): number {
    return this.records().filter(r => r.type === type).length;
  }

  getVerifiedCount(): number {
    return this.records().filter(r => r.status === 'verified').length;
  }

  getPendingCount(): number {
    return this.records().filter(r => r.status === 'pending' || !r.status).length;
  }

  viewRecord(record: MedicalRecord): void {
    if (record.fileUrl) {
      window.open(record.fileUrl, '_blank');
    } else {
      this.toast.info('No file attached to this record');
    }
  }

  downloadRecord(record: MedicalRecord): void {
    this.medicalRecordService.download(record.id).subscribe({
      next: (res) => {
        if (res.url) window.open(res.url, '_blank');
      },
      error: () => this.toast.error('Failed to download record')
    });
  }

  deleteRecord(record: MedicalRecord): void {
    if (!confirm('Are you sure you want to permanently delete this record?')) return;

    this.medicalRecordService.delete(record.id).subscribe({
      next: () => {
        this.toast.success('Record deleted successfully');
        this.loadRecords();
      },
      error: () => this.toast.error('Failed to delete record')
    });
  }

  uploadRecord(): void {
    this.router.navigate(['/doctor/records/upload']);
  }

  getPatientName(record: MedicalRecord): string {
    return record.patient
      ? `${record.patient.firstName} ${record.patient.lastName}`
      : 'Unknown Patient';
  }

  getRecordTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      lab: 'Lab Report',
      prescription: 'Prescription',
      imaging: 'Imaging Study',
      diagnosis: 'Diagnosis Note',
      other: 'Other Document'
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
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

  trackById(index: number, item: MedicalRecord): string {
    return item.id;
  }
}