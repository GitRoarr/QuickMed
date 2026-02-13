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
import { ConsultationService } from '@core/services/consultation.service';
import { ConsultationViewModalComponent } from '../../consultation/consultation-view-modal/consultation-view-modal.component';
import { ToastService } from '@core/services/toast.service';
import { forkJoin } from 'rxjs';
import { AppointmentDetailsPage } from './appointment-details.page';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-doctor-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe, DoctorHeaderComponent, DoctorSidebarComponent, AppointmentDetailsPage, ConsultationViewModalComponent],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.css'],
})
export class AppointmentsComponent implements OnInit {
  today = new Date();
  appointments = signal<Appointment[]>([]);
  filteredAppointments = signal<Appointment[]>([]);
  isLoading = signal(true);
  currentTime = signal(new Date());
  private refreshInterval: any;

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

  // Modal state
  showDetailsModal = signal(false);
  selectedAppointment: Appointment | null = null;

  // Consultation modal state
  showConsultationModal = signal(false);
  consultationAppointmentId = signal<string | null>(null);

  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private notificationService = inject(NotificationService);
  private consultationService = inject(ConsultationService);
  private toast = inject(ToastService);
  private router = inject(Router);

  // Computed Stats
  stats = computed(() => {
    const all = this.appointments();
    return {
      total: all.length,
      pending: all.filter(a => a.status === AppointmentStatus.PENDING).length,
      confirmed: all.filter(a => a.status === AppointmentStatus.CONFIRMED).length,
      completed: all.filter(a => a.status === AppointmentStatus.COMPLETED).length,
      overdue: all.filter(a => a.status === AppointmentStatus.OVERDUE).length,
      missed: all.filter(a => a.status === AppointmentStatus.MISSED).length
    };
  });

  constructor() {


    // React to filter changes
    effect(() => {
      this.applyFilters();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadAppointments();
    this.loadBadgeCounts();
    this.loadHeaderCounts();

    // Refresh every minute to update timers
    this.refreshInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
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
    if (status === AppointmentStatus.CONFIRMED) {
      this.appointmentService.confirm(idStr).subscribe({
        next: () => {
          this.toast.success('Appointment Confirmed', { title: 'Success' });
          this.loadAppointments();
        },
        error: () => this.toast.error('Failed to confirm appointment', { title: 'Error' })
      });
    } else {
      this.appointmentService.update(idStr, { status }).subscribe({
        next: () => {
          const msg = 'Appointment Updated';
          this.toast.success(msg, { title: 'Success' });
          this.loadAppointments();
        },
        error: () => this.toast.error('Action failed', { title: 'Error' })
      });
    }
  }

  cancelAppointment(id: string | number): void {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    this.appointmentService.delete(String(id)).subscribe({
      next: () => {
        this.toast.success('Appointment Cancelled', { title: 'Success' });
        this.loadAppointments();
      },
      error: () => this.toast.error('Failed to cancel appointment', { title: 'Error' })
    });
  }

  startConsultation(appointmentId: string | number): void {
    const id = String(appointmentId);
    const appt = this.appointments().find(a => String(a.id) === id);
    if (!appt) return;

    this.consultationService.start({
      appointmentId: id,
      doctorId: appt.doctorId,
      patientId: appt.patientId
    }).subscribe({
      next: (res) => {
        this.toast.success('Consultation started', { title: 'Success' });
        this.router.navigate(['/consultation/add', id], { queryParams: { consultationId: res.id } });
      },
      error: (err) => this.toast.error('Failed to start consultation', { title: 'Error' })
    });
  }

  viewPatientDetails(appt: Appointment): void {
    this.selectedAppointment = appt;
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedAppointment = null;
  }

  viewConsultation(appt: Appointment): void {
    const appointmentId = String(appt.id);
    this.consultationAppointmentId.set(appointmentId);
    this.showConsultationModal.set(true);
  }

  closeConsultationModal(): void {
    this.showConsultationModal.set(false);
    this.consultationAppointmentId.set(null);
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

  getRemainingTime(appointment: Appointment): string {
    const apptDate = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
    const now = this.currentTime();
    const diff = apptDate.getTime() - now.getTime();

    if (diff <= 0) return '';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 24) return '';
    if (hours > 0) return `${hours}h ${remainingMinutes}m`;
    return `${remainingMinutes}m`;
  }

  isUpcoming(appointment: Appointment): boolean {
    if (appointment.status !== AppointmentStatus.CONFIRMED && appointment.status !== AppointmentStatus.PENDING) return false;
    const apptDate = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
    const now = this.currentTime();
    const diff = apptDate.getTime() - now.getTime();
    // Within next 24 hours but not passed
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  }

  isOverdue(appointment: Appointment): boolean {
    if (appointment.status === AppointmentStatus.OVERDUE || appointment.status === AppointmentStatus.MISSED) return true;

    if (appointment.status !== AppointmentStatus.CONFIRMED && appointment.status !== AppointmentStatus.PENDING) return false;

    const apptDate = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
    const now = this.currentTime();
    return apptDate.getTime() < now.getTime();
  }
}