import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DoctorPatientSummary, DoctorService } from '@core/services/doctor.service';
import { AuthService } from '@core/services/auth.service';
import { BadgeService } from '@core/services/badge.service';
import { MessageService } from '@core/services/message.service';
import { AppointmentService } from '@core/services/appointment.service';
import { forkJoin } from 'rxjs';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { ToastService } from '@core/services/toast.service';

interface MenuItem {
  label: string;
  icon?: string;
  route: string;
  badge?: number;
  imgSrc?: string;
}

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
  private badgeService = inject(BadgeService);
  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);
  private toast = inject(ToastService);

  // Data Signals
  patients = signal<DoctorPatientSummary[]>([]);
  isLoading = signal(true);

  // Filter Signals
  searchTerm = signal('');
  statusFilter = signal<'all' | 'new' | 'active' | 'needs-review' | 'completed'>('all');

  readonly filterPills = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'active', label: 'Active' },
    { value: 'needs-review', label: 'Needs Review' },
    { value: 'completed', label: 'Completed' },
  ] as const;

  // UI/Theme Signals
  currentUser = signal<any>(null);
  menuItems = signal<MenuItem[]>([]);
  unreadNotifications = signal(0); // For topbar

  // Computed Logic
  filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const status = this.statusFilter();

    let list = [...this.patients()];

    // Status Filter
    if (status === 'active') {
      list = list.filter((p) => p.isActive !== false);
    } else if (status === 'new') {
      list = list.filter((p) => this.isNewPatient(p));
    } else if (status === 'needs-review') {
      list = list.filter((p) => this.isNeedsReview(p));
    } else if (status === 'completed') {
      list = list.filter((p) => this.isCompleted(p));
    }

    // Search Filter
    if (term) {
      list = list.filter((p) => {
        const name = this.getFullName(p).toLowerCase();
        const email = (p.email || '').toLowerCase();
        const phone = (p.phoneNumber || '').toLowerCase();
        const condition = (p.condition || '').toLowerCase();
        return name.includes(term) || email.includes(term) || phone.includes(term) || condition.includes(term);
      });
    }

    // Default: Recent
    list.sort((a, b) => {
      const aDate = this.getLastAppointmentDate(a)?.getTime() || 0;
      const bDate = this.getLastAppointmentDate(b)?.getTime() || 0;
      return bDate - aDate;
    });

    return list;
  });

  // Stats
  totalPatients = computed(() => this.patients().length);
  activePatients = computed(() => this.patients().filter((p) => p.isActive !== false).length);
  newThisWeek = computed(() => this.patients().filter((p) => this.isNewPatient(p)).length);
  followUpsDue = computed(() => this.patients().filter((p) => this.isNeedsReview(p)).length);
  totalVisits = computed(() => this.patients().reduce((acc, p) => acc + (p.totalAppointments || 0), 0));

  constructor() {
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadPatients();
    this.loadBadgeCounts();
  }

  loadUserData(): void {
    this.currentUser.set(this.authService.currentUser());
  }

  loadBadgeCounts(): void {
    forkJoin({
      pending: this.appointmentService.getPendingCount(),
      messages: this.messageService.getUnreadCount()
    }).subscribe(({ pending, messages }) => {
      this.updateMenuItems(pending.count || 0, messages.count || 0);
    });
  }

  updateMenuItems(pendingCount: number, messageCount: number): void {
    this.menuItems.set([
      { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
      { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: pendingCount || undefined },
      { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
      { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
      { label: 'Prescriptions', route: '/doctor/prescriptions', imgSrc: 'https://img.icons8.com/ios-filled/24/prescription.png' },
      { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: messageCount || undefined },
      { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
    ]);
  }

  loadPatients() {
    this.isLoading.set(true);
    this.doctorService.getPatients(1, 100).subscribe({
      next: (data) => {
        this.patients.set(data.patients || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load patients', err);
        this.patients.set([]);
        this.isLoading.set(false);
        this.toast.error('Failed to load patients', { title: 'Patients' });
      }
    });
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
    if (!last) return 'No visits yet';
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  getSegment(p: DoctorPatientSummary) {
    if ((p.totalAppointments || 0) >= 5) return 'High touch';
    if ((p.totalAppointments || 0) >= 2) return 'Established';
    return 'New';
  }

  getStatusTone(p: DoctorPatientSummary) {
    if (p.isActive === false) return 'muted';
    const lastStatus = (p.lastStatus || '').toLowerCase();
    if (lastStatus === 'pending') return 'warning';
    if (lastStatus === 'cancelled') return 'error';
    if (lastStatus === 'completed' || lastStatus === 'confirmed') return 'success';
    return 'info';
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