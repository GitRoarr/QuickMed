import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { MedicalRecordService, MedicalRecord } from '@core/services/medical-record.service';
import { AppointmentService } from '@core/services/appointment.service';
import { MessageService } from '@core/services/message.service';

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
  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);

  records = signal<MedicalRecord[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  currentUser = signal<any>(null);

  menuItems = signal<MenuItem[]>([]);

  ngOnInit(): void {
    this.loadUserData();
    this.loadRecords();
    this.loadBadgeCounts();
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

  loadBadgeCounts(): void {
    this.appointmentService.getPendingCount().subscribe({
      next: (apt) => {
        this.messageService.getUnreadCount().subscribe({
          next: (msg) => {
            this.updateMenuItems(apt.count || 0, msg.count || 0);
          }
        });
      }
    });
  }

  updateMenuItems(appointmentCount: number, messageCount: number): void {
    this.menuItems.set([
      { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
      { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: appointmentCount || undefined },
      { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
      { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
      { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/doctor/records' },
      { label: 'Prescriptions', icon: 'bi-prescription2', route: '/doctor/prescriptions' },
      { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: messageCount || undefined },
      { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
      { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
    ]);
  }

  viewRecord(record: MedicalRecord): void {
    if (record.fileUrl) window.open(record.fileUrl, '_blank');
  }

  downloadRecord(record: MedicalRecord): void {
    this.medicalRecordService.download(record.id).subscribe({
      next: (data) => {
        if (data.url) window.open(data.url, '_blank');
      }
    });
  }

  deleteRecord(record: MedicalRecord): void {
    if (!confirm('Are you sure you want to delete this record?')) return;

    this.medicalRecordService.delete(record.id).subscribe({
      next: () => this.loadRecords(),
      error: () => alert('Failed to delete record')
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
      imaging: 'Imaging',
      diagnosis: 'Diagnosis',
      other: 'Other'
    };
    return labels[type] || type;
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getDoctorName(): string {
    const u = this.currentUser();
    return u ? `${u.firstName} ${u.lastName}` : 'Doctor';
  }

  getDoctorSpecialty(): string {
    return this.currentUser()?.specialty || 'General Practitioner';
  }

  getDoctorInitials(): string {
    const name = this.getDoctorName().split(' ');
    return name.length >= 2
      ? (name[0][0] + name[1][0]).toUpperCase()
      : name[0].substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
