import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DoctorPatientSummary, DoctorService } from '@core/services/doctor.service';
import { AuthService } from '@core/services/auth.service';
import { MessageService } from '@core/services/message.service';
import { AppointmentService } from '@core/services/appointment.service';
import { MedicalRecordService } from '@core/services/medical-record.service';
import { PrescriptionService } from '@core/services/prescription.service';
import { NotificationService } from '@core/services/notification.service';
import { forkJoin } from 'rxjs';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-doctor-patients',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DatePipe, DoctorHeaderComponent, DoctorSidebarComponent],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.css']
})
export class PatientsComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);
  private medicalRecordService = inject(MedicalRecordService);
  private prescriptionService = inject(PrescriptionService);
  private notificationService = inject(NotificationService);
  private toast = inject(ToastService);

  // Data Signals
  patients = signal<DoctorPatientSummary[]>([]);
  isLoading = signal(true);

  // Filter Signals
  searchTerm = signal('');
  statusFilter = signal<'all' | 'new' | 'active' | 'needs-review' | 'completed'>('all');

  readonly filterPills = [
    { value: 'all', label: 'All', icon: 'bi-grid' },
    { value: 'new', label: 'New', icon: 'bi-star' },
    { value: 'active', label: 'Active', icon: 'bi-check-circle' },
    { value: 'needs-review', label: 'Needs Review', icon: 'bi-exclamation-circle' },
    { value: 'completed', label: 'Completed', icon: 'bi-check2-all' },
  ] as const;

  // UI/Theme Signals
  currentUser = signal<any>(null);
  unreadNotifications = signal(0);

  // Computed Logic
  filteredPatients = computed(() => this.patients());

  // Stats
  totalPatients = computed(() => this.patients().length);
  activePatients = computed(() => this.patients().filter((p) => p.isActive !== false).length);
  newThisWeek = computed(() => this.patients().filter((p) => this.isNewPatient(p)).length);
  followUpsDue = computed(() => this.patients().filter((p) => this.isNeedsReview(p)).length);
  totalVisits = computed(() => this.patients().reduce((acc, p) => acc + (p.totalAppointments || 0), 0));

  ngOnInit(): void {
    this.loadUserData();
    this.loadPatients();
    this.loadNotificationBadge();
    effect(() => {
      this.searchTerm();
      this.statusFilter();
      this.loadPatients();
    });
  }

  loadUserData(): void {
    this.currentUser.set(this.authService.currentUser());
  }

  loadNotificationBadge(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotifications.set(count || 0),
      error: () => { }
    });
  }

  loadPatients() {
    this.isLoading.set(true);
    this.doctorService.getPatients(1, 100, this.searchTerm(), this.statusFilter()).subscribe({
      next: (data) => {
        this.patients.set(data.patients || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load patients', err);
        this.patients.set([]);
        this.isLoading.set(false);
        this.toast.error('Failed to load patients');
      }
    });
  }


  viewRecords(p: DoctorPatientSummary, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/doctor/records'], { queryParams: { patientId: p.patientId } });
  }

  messagePatient(p: DoctorPatientSummary, event: Event): void {
    event.stopPropagation();
    this.messageService.createConversation(p.patientId).subscribe({
      next: (conversation) => {
        this.router.navigate(['/doctor/messages'], {
          queryParams: { conversationId: conversation.id, patientId: p.patientId }
        });
      },
      error: () => {
        this.router.navigate(['/doctor/messages'], {
          queryParams: { patientId: p.patientId }
        });
      }
    });
  }

  consultPatient(p: DoctorPatientSummary, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/doctor/appointments'], {
      queryParams: { action: 'consult', patientId: p.patientId, patientName: this.getFullName(p) }
    });
  }

  viewPatientDetail(p: DoctorPatientSummary): void {
    this.router.navigate(['/doctor/patients', p.patientId]);
  }

  

  isNewPatient(p: DoctorPatientSummary): boolean {
    const last = this.getLastAppointmentDate(p);
    if (!last) return false;
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    return (p.totalAppointments || 0) <= 1 && diffDays <= 7;
  }

  isNeedsReview(p: DoctorPatientSummary): boolean {
    const status = (p.lastStatus || '').toLowerCase();
    if (['pending', 'cancelled', 'no_show'].includes(status)) return true;
    const last = this.getLastAppointmentDate(p);
    if (!last) return false;
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  }

  isCompleted(p: DoctorPatientSummary): boolean {
    const status = (p.lastStatus || '').toLowerCase();
    return status === 'completed' || status === 'confirmed';
  }

  getFullName(p: DoctorPatientSummary) {
    return `${p.firstName || ''} ${p.lastName || ''}`.trim();
  }

  getInitials(p: DoctorPatientSummary) {
    const first = (p.firstName || 'P').charAt(0);
    const last = (p.lastName || '').charAt(0);
    return `${first}${last}`.toUpperCase();
  }

  getLastAppointmentDate(p: DoctorPatientSummary): Date | null {
    if (!p.lastAppointmentDate) return null;
    const datePart = new Date(p.lastAppointmentDate);
    if (p.lastAppointmentTime) {
      const [h, m] = p.lastAppointmentTime.split(':').map(Number);
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        datePart.setHours(h, m, 0, 0);
      }
    }
    return datePart;
  }

  formatLastSeen(p: DoctorPatientSummary) {
    const last = this.getLastAppointmentDate(p);
    if (!last) return 'No visits';
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  getPatientMeta(p: DoctorPatientSummary): string {
    const gender = p.gender || 'Patient';
    const age = p.age ? `${p.age}` : '';
    const condition = p.condition || 'General care';
    const pieces = [gender];
    if (age) pieces.push(age);
    return `${pieces.join(', ')} • ${condition}`;
  }

  getTag(p: DoctorPatientSummary): string {
    if (this.isNewPatient(p)) return 'New';
    if (this.isNeedsReview(p)) return 'Needs Review';
    if (this.isCompleted(p)) return 'Completed';
    if (p.isActive === false) return 'Inactive';
    return 'Active';
  }

  getTagTone(p: DoctorPatientSummary): 'new' | 'active' | 'needs-review' | 'completed' | 'inactive' {
    if (this.isNewPatient(p)) return 'new';
    if (this.isNeedsReview(p)) return 'needs-review';
    if (this.isCompleted(p)) return 'completed';
    if (p.isActive === false) return 'inactive';
    return 'active';
  }

  getDoctorName(): string {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Doctor';
  }

  getDoctorSpecialty(): string {
    return this.currentUser()?.specialty || 'General Practitioner';
  }

  getDoctorInitials(): string {
    const name = this.getDoctorName();
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}