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

  // Data Signals
  patients = signal<DoctorPatientSummary[]>([]);
  isLoading = signal(true);
  
  // Filter Signals
  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  sortBy = signal<'recent' | 'visits' | 'alpha'>('recent');

  // Typed status options for template iteration
  readonly statuses = ['all', 'active', 'inactive'] as const;

  // UI/Theme Signals
  themeMode = signal<'light' | 'dark'>('light');
  currentUser = signal<any>(null);
  menuItems = signal<MenuItem[]>([]);
  unreadNotifications = signal(0); // For topbar

  // Computed Logic
  filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const status = this.statusFilter();
    const sort = this.sortBy();

    let list = [...this.patients()];

    // Status Filter
    if (status === 'active') {
      list = list.filter(p => p.isActive !== false);
    } else if (status === 'inactive') {
      list = list.filter(p => p.isActive === false);
    }

    // Search Filter
    if (term) {
      list = list.filter(p => {
        const name = this.getFullName(p).toLowerCase();
        const email = (p.email || '').toLowerCase();
        const phone = (p.phoneNumber || '').toLowerCase();
        return name.includes(term) || email.includes(term) || phone.includes(term);
      });
    }

    // Sort
    list.sort((a, b) => {
      if (sort === 'visits') return (b.totalAppointments || 0) - (a.totalAppointments || 0);
      if (sort === 'alpha') return this.getFullName(a).localeCompare(this.getFullName(b));
      
      // Default: Recent
      const aDate = this.getLastAppointmentDate(a)?.getTime() || 0;
      const bDate = this.getLastAppointmentDate(b)?.getTime() || 0;
      return bDate - aDate;
    });

    return list;
  });

  // Stats
  totalPatients = computed(() => this.patients().length);
  activePatients = computed(() => this.patients().filter(p => p.isActive !== false).length);
  inactivePatients = computed(() => this.patients().filter(p => p.isActive === false).length);
  avgVisits = computed(() => {
    const list = this.patients();
    if (!list.length) return 0;
    const sum = list.reduce((acc, p) => acc + (p.totalAppointments || 0), 0);
    return Math.round((sum / list.length) * 10) / 10;
  });
  recentlySeen = computed(() => {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
    return this.patients().filter(p => {
      const last = this.getLastAppointmentDate(p);
      return last ? last >= monthAgo : false;
    }).length;
  });

  Math = Math; 

  constructor() {
    effect(() => {
      const mode = this.themeMode();
      if (mode === 'dark') {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
      } else {
        document.body.classList.add('light');
        document.body.classList.remove('dark');
      }
    });
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
    this.doctorService.getMyPatients().subscribe({
      next: (data) => {
        this.patients.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load patients', err);
        this.patients.set([]);
        this.isLoading.set(false);
      }
    });
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

  setTheme(mode: 'light' | 'dark'): void {
    this.themeMode.set(mode);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}