import { Component, OnInit, signal, inject, effect, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { AppointmentService } from '@core/services/appointment.service';
import { Appointment, AppointmentStatus } from '@core/models/appointment.model';
import { AuthService } from '@core/services/auth.service';
import { BadgeService } from '@core/services/badge.service';
import { MessageService } from '@core/services/message.service';
import { NotificationService } from '@core/services/notification.service';
import { ToastService } from '@core/services/toast.service';
import { forkJoin } from 'rxjs';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe, DoctorHeaderComponent, DoctorSidebarComponent],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.css'],
})
export class AppointmentsComponent implements OnInit {
  today = new Date();
  appointments = signal<Appointment[]>([]);
  filteredAppointments = signal<Appointment[]>([]);
  isLoading = signal(true);

  // Filters
  searchQuery = signal('');
  selectedStatus = signal<string>('all');

  // Layout & Theme
  currentUser = signal<any>(null);
  menuItems = signal<MenuItem[]>([]);
  unreadMessages = signal(0);
  unreadNotifications = signal(0);

  // Enums for HTML
  AppointmentStatus = AppointmentStatus;

  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private notificationService = inject(NotificationService);
  private toast = inject(ToastService);
  private router = inject(Router);

  // Computed Stats
  stats = computed(() => {
    const all = this.appointments();
    return {
      total: all.length,
      pending: all.filter(a => a.status === AppointmentStatus.PENDING).length,
      confirmed: all.filter(a => a.status === AppointmentStatus.CONFIRMED).length,
      completed: all.filter(a => a.status === AppointmentStatus.COMPLETED).length
    };
  });

  constructor() {


    // React to filter changes
    effect(() => {
      this.applyFilters();
    });
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadAppointments();
    this.loadBadgeCounts();
    this.loadHeaderCounts();
  }

  loadUserData(): void {
    this.currentUser.set(this.authService.currentUser());
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.appointmentService.getMyAppointments().subscribe({
      next: (data) => {
        this.appointments.set(data);
        this.applyFilters(); // Trigger initial filter
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load appointments');
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    let result = this.appointments();
    const query = this.searchQuery().toLowerCase();
    const status = this.selectedStatus();

    // 1. Filter by Status
    if (status !== 'all') {
      result = result.filter(a => a.status === status);
    }

    // 2. Filter by Search (Name or Notes)
    if (query) {
      result = result.filter(a =>
        (a.patient?.firstName?.toLowerCase() || '').includes(query) ||
        (a.patient?.lastName?.toLowerCase() || '').includes(query) ||
        (a.notes?.toLowerCase() || '').includes(query)
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(`${a.appointmentDate}T${a.appointmentTime}`);
      const dateB = new Date(`${b.appointmentDate}T${b.appointmentTime}`);
      return dateB.getTime() - dateA.getTime();
    });

    this.filteredAppointments.set(result);
  }

  updateStatus(id: string | number, status: AppointmentStatus): void {
    const idStr = String(id);
    this.appointmentService.update(idStr, { status }).subscribe({
      next: () => {
        const msg = status === AppointmentStatus.CONFIRMED ? 'Appointment Confirmed' : 'Appointment Completed';
        this.toast.success(msg, { title: 'Success' });
        this.loadAppointments(); // Reload to refresh lists/stats
      },
      error: () => this.toast.error('Action failed', { title: 'Error' })
    });
  }

  viewPatientDetails(appt: Appointment): void {
    if (appt.patientId) {
      this.router.navigate(['/doctor/patients', appt.patientId]);
    }
  }

  // Layout Helpers
  loadBadgeCounts(): void {
    forkJoin({
      pending: this.appointmentService.getPendingCount(),
      messages: this.messageService.getUnreadCount()
    }).subscribe(({ pending, messages }) => {
      this.updateMenuItems(pending.count || 0, messages.count || 0);
    });
  }

  loadHeaderCounts(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotifications.set(count || 0),
      error: () => this.unreadNotifications.set(0),
    });
  }

  updateMenuItems(pendingCount: number, messageCount: number): void {
    this.menuItems.set([
      { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
      { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: pendingCount || undefined },
      { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
      { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
      { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: messageCount || undefined },
      { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
    ]);
  }



  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
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

  formatTime(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${period}`;
  }
}