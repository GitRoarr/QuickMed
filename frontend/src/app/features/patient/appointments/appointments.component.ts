import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { Appointment as AppointmentModel } from '../../../core/models/appointment.model';
import { PayButtonComponent } from '../../../shared/components/pay-button/pay-button.component';
import { PatientShellComponent } from '../shared/patient-shell/patient-shell.component';

interface Appointment {
  id: string;
  doctor: { firstName: string; lastName: string; specialty: string };
  appointmentDate: string;
  appointmentTime: string;
  location?: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  isVideoConsultation?: boolean;
  notes?: string;
}

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, PayButtonComponent, PatientShellComponent],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.css'],
})
export class AppointmentsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly appointmentService = inject(AppointmentService);
  private readonly authService = inject(AuthService);
  private readonly doctorService = inject(DoctorService);

  appointments = signal<AppointmentModel[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  activeSegment = signal<'upcoming' | 'completed'>('upcoming');

  availableTimes: string[] = [];
  selectedDate: string = '';
  selectedDoctorId: string = '';

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
      },
    });
  }

  onSearchChange(): void {
    // computed signal automatically reacts
  }

  setSegment(segment: 'upcoming' | 'completed'): void {
    this.activeSegment.set(segment);
  }

  getAppointmentStats() {
    const all = this.appointments();
    return {
      total: all.length,
      pending: all.filter(a => a.status === 'pending').length,
      confirmed: all.filter(a => a.status === 'confirmed').length,
      completed: all.filter(a => a.status === 'completed').length
    };
  }

  bookNewAppointment(): void {
    this.router.navigate(['/patient/doctors']);
  }

  rescheduleAppointment(appointmentId: string): void {
    console.log('Reschedule appointment:', appointmentId);
  }

  cancelAppointment(appointmentId: string): void {
    console.log('Cancel appointment:', appointmentId);
  }

  joinVideoCall(appointmentId: string): void {
    console.log('Join video call:', appointmentId);
  }

  viewDetails(appointmentId: string): void {
    console.log('View details:', appointmentId);
  }

  goHome() {
    this.router.navigate(['/']);
  }

  // Example: Call this when a date and doctor are selected
  fetchAvailableTimes() {
    if (!this.selectedDoctorId || !this.selectedDate) return;
    this.doctorService.getAvailability(this.selectedDoctorId, this.selectedDate)
      .subscribe(times => this.availableTimes = times);
  }

  // Example: Call this when the date input changes
  onDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedDate = input.value;
    this.fetchAvailableTimes();
  }

  // Example: Call this when the doctor selection changes
  onDoctorChange(doctorId: string) {
    this.selectedDoctorId = doctorId;
    this.fetchAvailableTimes();
  }
}
