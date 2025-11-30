import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { MedicalRecordService, MedicalRecord } from '@core/services/medical-record.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-doctor-records',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './records.component.html',
  styleUrls: ['./records.component.css']
})
export class RecordsComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private medicalRecordService = inject(MedicalRecordService);

  records = signal<MedicalRecord[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  currentUser = signal<any>(null);

  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
    { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: 5 },
    { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
    { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
    { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/doctor/records' },
    { label: 'Prescriptions', icon: 'bi-prescription2', route: '/doctor/prescriptions' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: 3 },
    { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
    { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
  ];

  ngOnInit(): void {
    this.loadUserData();
    this.loadRecords();
  }

  loadUserData(): void {
    const user = this.authService.currentUser();
    this.currentUser.set(user);
  }

  loadRecords(): void {
    this.isLoading.set(true);
    this.medicalRecordService.getMyRecords(this.searchQuery() || undefined).subscribe({
      next: (data) => {
        this.records.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading records:', error);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.loadRecords();
  }

  viewRecord(record: MedicalRecord): void {
    if (record.fileUrl) {
      window.open(record.fileUrl, '_blank');
    }
  }

  downloadRecord(record: MedicalRecord): void {
    this.medicalRecordService.download(record.id).subscribe({
      next: (data) => {
        if (data.url) {
          window.open(data.url, '_blank');
        }
      },
      error: () => {
        alert('Failed to download record');
      }
    });
  }

  deleteRecord(record: MedicalRecord): void {
    if (confirm('Are you sure you want to delete this record?')) {
      this.medicalRecordService.delete(record.id).subscribe({
        next: () => {
          this.loadRecords();
        },
        error: () => {
          alert('Failed to delete record');
        }
      });
    }
  }

  uploadRecord(): void {
    // Navigate to upload form or open modal
    console.log('Upload record');
  }

  getPatientName(record: MedicalRecord): string {
    if (record.patient) {
      return `${record.patient.firstName} ${record.patient.lastName}`;
    }
    return 'Unknown Patient';
  }

  getRecordTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'lab': 'Lab Report',
      'prescription': 'Prescription',
      'imaging': 'X-Ray',
      'diagnosis': 'Diagnosis',
      'other': 'Other',
    };
    return labels[type] || type;
  }

  formatFileSize(bytes: number | undefined): string {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getDoctorName(): string {
    const user = this.currentUser();
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Doctor';
  }

  getDoctorSpecialty(): string {
    const user = this.currentUser();
    return user?.specialty || 'General Practitioner';
  }

  getDoctorInitials(): string {
    const name = this.getDoctorName();
    if (!name) return 'DR';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
