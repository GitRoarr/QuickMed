import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { DoctorSlot, SchedulingService } from '../../../core/services/schedule.service';
import { Appointment as AppointmentModel } from '../../../core/models/appointment.model';
import { PayButtonComponent } from '../../../shared/components/pay-button/pay-button.component';
import { PatientShellComponent } from '../shared/patient-shell/patient-shell.component';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, PayButtonComponent, PatientShellComponent, RouterModule],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.css'],
})
export class AppointmentsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly appointmentService = inject(AppointmentService);
  private readonly authService = inject(AuthService);
  private readonly doctorService = inject(DoctorService);
  private readonly scheduleService = inject(SchedulingService);
  private readonly toast = inject(ToastService);

  appointments = signal<AppointmentModel[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  activeSegment = signal<'upcoming' | 'completed'>('upcoming');

  detailAppointment = signal<AppointmentModel | null>(null);
  showDetailModal = signal(false);
  detailLoading = signal(false);

  cancelTarget = signal<AppointmentModel | null>(null);
  showCancelModal = signal(false);
  cancelLoading = signal(false);

   rescheduleTarget = signal<AppointmentModel | null>(null);
  showRescheduleModal = signal(false);
  rescheduleLoading = signal(false);
  rescheduleDate = signal('');
  rescheduleTime = signal('');
  availableSlots = signal<DoctorSlot[]>([]);
  slotsLoading = signal(false);

  visibleAppointments = computed(() => {
    let list = [...this.appointments()];
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter((apt) => {
        const doctorName = `${apt.doctor?.firstName ?? ''} ${apt.doctor?.lastName ?? ''}`.toLowerCase();
        return (
          doctorName.includes(query) ||
          (apt.doctor?.specialty ?? '').toLowerCase().includes(query) ||
          (apt.location ?? '').toLowerCase().includes(query)
        );
      });
    }
    if (this.activeSegment() === 'upcoming') {
      list = list.filter((apt) => apt.status !== 'completed' && apt.status !== 'cancelled');
    } else {
      list = list.filter((apt) => apt.status === 'completed');
    }
    return list.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
  });

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.appointmentService.getMyAppointments().subscribe({
      next: (apts) => {
        this.appointments.set(apts as AppointmentModel[]);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load appointments', err);
        this.appointments.set([]);
        this.isLoading.set(false);
        this.toast.error('Failed to load appointments', { title: 'Appointments' });
      },
    });
  }

  onSearchChange(): void {}

  setSegment(segment: 'upcoming' | 'completed'): void {
    this.activeSegment.set(segment);
  }

  getAppointmentStats() {
    const all = this.appointments();
    return {
      total: all.length,
      pending: all.filter(a => a.status === 'pending').length,
      confirmed: all.filter(a => a.status === 'confirmed').length,
      completed: all.filter(a => a.status === 'completed').length,
    };
  }

  bookNewAppointment(): void {
    this.router.navigate(['/patient/doctors']);
  }

  goHome() {
    this.router.navigate(['/']);
  }

  viewDetails(appointmentId: string): void {
    this.detailLoading.set(true);
    this.showDetailModal.set(true);
    this.appointmentService.getOne(appointmentId).subscribe({
      next: (apt) => {
        this.detailAppointment.set(apt);
        this.detailLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load appointment details');
        this.showDetailModal.set(false);
        this.detailLoading.set(false);
      },
    });
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.detailAppointment.set(null);
  }

  openCancelModal(apt: AppointmentModel): void {
    this.cancelTarget.set(apt);
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
    this.cancelTarget.set(null);
  }

  confirmCancel(): void {
    const apt = this.cancelTarget();
    if (!apt) return;
    this.cancelLoading.set(true);
    this.appointmentService.cancel(apt.id).subscribe({
      next: () => {
        this.toast.success('Appointment cancelled successfully');
        this.cancelLoading.set(false);
        this.closeCancelModal();
        this.loadAppointments();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to cancel appointment');
        this.cancelLoading.set(false);
      },
    });
  }

  // ─── Reschedule Modal ──────────────────────────────────────
  openRescheduleModal(apt: AppointmentModel): void {
    this.rescheduleTarget.set(apt);
    this.rescheduleDate.set('');
    this.rescheduleTime.set('');
    this.availableSlots.set([]);
    this.showRescheduleModal.set(true);
  }

  closeRescheduleModal(): void {
    this.showRescheduleModal.set(false);
    this.rescheduleTarget.set(null);
  }

  onRescheduleDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const dateStr = input.value;
    this.rescheduleDate.set(dateStr);
    this.rescheduleTime.set('');
    if (!dateStr) {
      this.availableSlots.set([]);
      return;
    }
    const apt = this.rescheduleTarget();
    if (!apt) return;
    this.slotsLoading.set(true);
    this.scheduleService.getDaySchedulePublic(apt.doctorId, dateStr).subscribe({
      next: (slots) => {
        const available = (slots || []).filter((s: any) => s.status === 'available');
        this.availableSlots.set(available);
        this.slotsLoading.set(false);
      },
      error: () => {
        this.availableSlots.set([]);
        this.slotsLoading.set(false);
      },
    });
  }

  selectRescheduleSlot(slot: DoctorSlot): void {
    this.rescheduleTime.set(slot.startTime || slot.time || '');
  }

  confirmReschedule(): void {
    const apt = this.rescheduleTarget();
    const date = this.rescheduleDate();
    const time = this.rescheduleTime();
    if (!apt || !date || !time) return;
    this.rescheduleLoading.set(true);
    this.appointmentService.update(apt.id, { appointmentDate: date, appointmentTime: time }).subscribe({
      next: () => {
        this.toast.success('Appointment rescheduled successfully');
        this.rescheduleLoading.set(false);
        this.closeRescheduleModal();
        this.loadAppointments();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to reschedule appointment');
        this.rescheduleLoading.set(false);
      },
    });
  }

  getMinDate(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  joinVideoCall(appointmentId: string): void {
    this.toast.success('Opening video room...', { title: 'Appointments' });
  }

  formatTime(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
  }
}
