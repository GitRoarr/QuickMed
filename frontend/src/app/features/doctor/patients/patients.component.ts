import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DoctorPatientSummary, DoctorService } from '@core/services/doctor.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-doctor-patients',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DatePipe],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.css']
})
export class PatientsComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private authService = inject(AuthService);
  private router = inject(Router);

  patients = signal<DoctorPatientSummary[]>([]);
  isLoading = signal(true);
  searchTerm = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  sortBy = signal<'recent' | 'visits' | 'alpha'>('recent');

  filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const status = this.statusFilter();
    const sort = this.sortBy();

    let list = [...this.patients()];

    if (status === 'active') {
      list = list.filter(p => p.isActive !== false);
    } else if (status === 'inactive') {
      list = list.filter(p => p.isActive === false);
    }

    if (term) {
      list = list.filter(p => {
        const name = this.getFullName(p).toLowerCase();
        const email = (p.email || '').toLowerCase();
        const phone = (p.phoneNumber || '').toLowerCase();
        return name.includes(term) || email.includes(term) || phone.includes(term);
      });
    }

    list.sort((a, b) => {
      if (sort === 'visits') return (b.totalAppointments || 0) - (a.totalAppointments || 0);
      if (sort === 'alpha') return this.getFullName(a).localeCompare(this.getFullName(b));

      const aDate = this.getLastAppointmentDate(a)?.getTime() || 0;
      const bDate = this.getLastAppointmentDate(b)?.getTime() || 0;
      return bDate - aDate;
    });

    return list;
  });

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

  menuItems = [
    { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
    { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments' },
    { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
    { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
    { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/doctor/records' },
    { label: 'Prescriptions', icon: 'bi-prescription2', route: '/doctor/prescriptions' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages' },
    { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
    { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
  ];

  currentUser = this.authService.currentUser;

  // --- Dashboard sidebar/topbar helpers ---
  navigate(route: string): void {
    this.router.navigate([route]);
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
  Math = Math;

  ngOnInit(): void {
    this.loadPatients();
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
    if (lastStatus === 'pending') return 'pending';
    if (lastStatus === 'cancelled') return 'danger';
    if (lastStatus === 'completed' || lastStatus === 'confirmed') return 'success';
    return 'info';
  }
}
