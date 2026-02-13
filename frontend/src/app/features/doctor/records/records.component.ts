import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { AuthService } from '@core/services/auth.service';
import { MedicalRecordService, MedicalRecord, MedicalRecordStats, CreateMedicalRecordDto } from '@core/services/medical-record.service';
import { DoctorService, DoctorPatientSummary } from '@core/services/doctor.service';
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
    FormsModule,
    DoctorSidebarComponent,
    DoctorHeaderComponent
  ],
  templateUrl: './records.component.html',
  styleUrls: ['./records.component.css'],
  animations: [
    trigger('backdropFade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
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
    ])
  ]
})
export class RecordsComponent implements OnInit {
  private authService = inject(AuthService);
  private medicalRecordService = inject(MedicalRecordService);
  private doctorService = inject(DoctorService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private toast = inject(ToastService);

  records = signal<MedicalRecord[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  activeFilter = signal<'all' | 'lab' | 'imaging' | 'prescription' | 'diagnosis' | 'other'>('all');
  currentUser = signal<any>(null);
  unreadNotificationCount = signal(0);

  // Stats from backend
  stats = signal<MedicalRecordStats>({
    total: 0, labCount: 0, imagingCount: 0, diagnosisCount: 0,
    prescriptionCount: 0, otherCount: 0, verifiedCount: 0, pendingCount: 0, thisWeekCount: 0
  });

  // Create modal state
  showCreateModal = signal(false);
  isCreating = signal(false);
  patients = signal<DoctorPatientSummary[]>([]);
  newRecord: CreateMedicalRecordDto = {
    title: '',
    type: 'lab',
    patientId: '',
    notes: '',
    description: '',
    recordDate: new Date().toISOString().split('T')[0],
    status: 'pending',
  };

  // Detail modal
  showDetailModal = signal(false);
  selectedRecord = signal<MedicalRecord | null>(null);

  typeFilters = [
    { label: 'All', value: 'all' as const, icon: 'bi-grid' },
    { label: 'Lab Reports', value: 'lab' as const, icon: 'bi-clipboard2-pulse' },
    { label: 'Imaging', value: 'imaging' as const, icon: 'bi-image' },
    { label: 'Prescriptions', value: 'prescription' as const, icon: 'bi-capsule' },
    { label: 'Diagnosis', value: 'diagnosis' as const, icon: 'bi-file-earmark-text' },
    { label: 'Other', value: 'other' as const, icon: 'bi-file-earmark' },
  ];

  recordTypes = [
    { label: 'Lab Report', value: 'lab' },
    { label: 'Imaging Study', value: 'imaging' },
    { label: 'Prescription', value: 'prescription' },
    { label: 'Diagnosis Note', value: 'diagnosis' },
    { label: 'Other Document', value: 'other' },
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
    this.loadStats();
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

  loadStats(): void {
    this.medicalRecordService.getStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => { } // fail silently for stats
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

  // Create record modal
  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.resetNewRecord();
    // Load patients
    this.doctorService.getPatients(1, 200).subscribe({
      next: (res) => this.patients.set(res.patients || []),
      error: () => this.toast.error('Failed to load patients')
    });
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  resetNewRecord(): void {
    this.newRecord = {
      title: '',
      type: 'lab',
      patientId: '',
      notes: '',
      description: '',
      recordDate: new Date().toISOString().split('T')[0],
      status: 'pending',
    };
  }

  submitRecord(): void {
    if (!this.newRecord.title || !this.newRecord.patientId) {
      this.toast.error('Please fill in all required fields');
      return;
    }
    this.isCreating.set(true);
    this.medicalRecordService.create(this.newRecord).subscribe({
      next: () => {
        this.toast.success('Medical record created successfully!');
        this.showCreateModal.set(false);
        this.isCreating.set(false);
        this.loadRecords();
        this.loadStats();
      },
      error: () => {
        this.isCreating.set(false);
        this.toast.error('Failed to create record');
      }
    });
  }

  // Detail modal
  openDetailModal(record: MedicalRecord): void {
    this.selectedRecord.set(record);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedRecord.set(null);
  }

  // Status management
  verifyRecord(record: MedicalRecord): void {
    this.medicalRecordService.updateStatus(record.id, 'verified').subscribe({
      next: (updated) => {
        this.toast.success('Record verified');
        this.loadRecords();
        this.loadStats();
        if (this.selectedRecord()?.id === record.id) {
          this.selectedRecord.set({ ...record, status: 'verified' });
        }
      },
      error: () => this.toast.error('Failed to verify record')
    });
  }

  rejectRecord(record: MedicalRecord): void {
    this.medicalRecordService.updateStatus(record.id, 'rejected').subscribe({
      next: () => {
        this.toast.success('Record marked as rejected');
        this.loadRecords();
        this.loadStats();
      },
      error: () => this.toast.error('Failed to update record')
    });
  }

  viewRecord(record: MedicalRecord): void {
    this.openDetailModal(record);
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
        this.loadStats();
        if (this.showDetailModal()) this.closeDetailModal();
      },
      error: () => this.toast.error('Failed to delete record')
    });
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

  getRecordTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      lab: 'bi-clipboard2-pulse',
      prescription: 'bi-capsule',
      imaging: 'bi-image',
      diagnosis: 'bi-file-earmark-text',
      other: 'bi-file-earmark'
    };
    return icons[type] || 'bi-file-earmark';
  }

  getRecordTypeColor(type: string): string {
    const colors: Record<string, string> = {
      lab: 'purple',
      prescription: 'emerald',
      imaging: 'cyan',
      diagnosis: 'orange',
      other: 'gray'
    };
    return colors[type] || 'gray';
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

  getPatientInitials(name: string): string {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  getTimeSince(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  trackById(index: number, item: MedicalRecord): string {
    return item.id;
  }
}