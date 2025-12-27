import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { AuthService } from '@core/services/auth.service';
import { MedicalRecordService, MedicalRecord } from '@core/services/medical-record.service';
import { NotificationService } from '@core/services/notification.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-doctor-records',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterModule,
    DoctorSidebarComponent,
    DoctorHeaderComponent
  ],
  templateUrl: './records.component.html',
  // No styleUrls — using Tailwind only
})
export class RecordsComponent implements OnInit {
  private authService = inject(AuthService);
  private medicalRecordService = inject(MedicalRecordService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  themeService = inject(ThemeService);

  records = signal<MedicalRecord[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  currentUser = signal<any>(null);
  unreadNotificationCount = signal(0);

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
      error: () => this.isLoading.set(false)
    });
  }

  onSearchChange(): void {
    this.loadRecords();
  }

  loadUnreadNotifications(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotificationCount.set(count || 0)
    });
  }

  viewRecord(record: MedicalRecord): void {
    if (record.fileUrl) window.open(record.fileUrl, '_blank');
  }

  downloadRecord(record: MedicalRecord): void {
    this.medicalRecordService.download(record.id).subscribe({
      next: (res) => {
        if (res.url) window.open(res.url, '_blank');
      }
    });
  }

  deleteRecord(record: MedicalRecord): void {
    if (!confirm('Are you sure you want to permanently delete this record?')) return;

    this.medicalRecordService.delete(record.id).subscribe({
      next: () => this.loadRecords(),
      error: () => alert('Failed to delete record. Please try again.')
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

  onThemeChange(mode: 'light' | 'dark'): void {
    const isDark = this.themeService.isDarkMode();
    if (mode === 'dark' && !isDark) {
      this.themeService.toggleTheme();
    } else if (mode === 'light' && isDark) {
      this.themeService.toggleTheme();
    }
  }
}