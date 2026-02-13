import { Component, OnInit, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '@core/services/appointment.service';
import { Appointment } from '@core/models/appointment.model';

@Component({
  selector: 'app-appointment-details-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointment-details.page.html',
  styleUrls: ['./appointment-details.page.css'],
})
export class AppointmentDetailsPage implements OnInit {
  @Input() appointmentId!: string;
  @Output() closeModal = new EventEmitter<void>();

  private appointmentService = inject(AppointmentService);

  appointment = signal<Appointment | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.appointmentId) {
      this.error.set('No appointment ID provided.');
      this.isLoading.set(false);
      return;
    }

    this.loadAppointment();
  }

  private loadAppointment(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.appointmentService.getAppointmentById(String(this.appointmentId)).subscribe({
      next: (data) => {
        this.appointment.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load appointment details.');
        this.isLoading.set(false);
      },
    });
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('ad-backdrop')) {
      this.closeModal.emit();
    }
  }

  getInitials(user: any): string {
    if (!user) return '?';
    return ((user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '')).toUpperCase();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed': return 'ad-status-confirmed';
      case 'completed': return 'ad-status-completed';
      case 'cancelled': return 'ad-status-cancelled';
      case 'pending': return 'ad-status-pending';
      case 'waiting': return 'ad-status-waiting';
      case 'in-progress': return 'ad-status-in-progress';
      default: return 'ad-status-default';
    }
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatTime(time: string | undefined): string {
    if (!time) return 'N/A';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${period}`;
  }

  formatDateTime(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
