import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { DoctorService, DoctorListItem } from '@app/core/services/doctor.service';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { ToastService } from '@app/core/services/toast.service';

@Component({
  selector: 'app-receptionist-appointment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SidebarComponent],
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.css'],
})
export class AppointmentFormComponent implements OnInit {
  private readonly receptionistService = inject(ReceptionistService);
  private readonly doctorService = inject(DoctorService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  public readonly themeService = inject(ThemeService);
  private readonly toast = inject(ToastService);

  menuItems = [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/receptionist/dashboard', exact: true },
    { label: 'Appointments', icon: 'bi-calendar-check', route: '/receptionist/appointments' },
    { label: 'Patients', icon: 'bi-people', route: '/receptionist/patients' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/receptionist/messages' },
    { label: 'Payments', icon: 'bi-cash-stack', route: '/receptionist/payments' },
    { label: 'Doctors', icon: 'bi-stethoscope', route: '/receptionist/doctors' },
    { label: 'Reports', icon: 'bi-bar-chart', route: '/receptionist/reports' },
  ];

  secondaryItems = [
    { label: 'Settings', icon: 'bi-gear', route: '/receptionist/settings' },
    { label: 'Logout', icon: 'bi-box-arrow-right', action: () => this.authService.logout() },
  ];

  doctors = signal<DoctorListItem[]>([]);
  patients = signal<any[]>([]);
  availableSlots = signal<any[]>([]);

  model = signal<any>({ patientId: '', doctorId: '', appointmentDate: '', appointmentTime: '', notes: '' });
  isSaving = signal(false);
  isLoadingSlots = signal(false);

  ngOnInit(): void {
    this.loadDoctors();
    this.loadPatients();
  }

  private loadDoctors(): void {
    this.doctorService.listDoctors().subscribe({
      next: (list) => this.doctors.set(list || []),
      error: () => this.doctors.set([]),
    });
  }

  private loadPatients(): void {
    this.receptionistService.listPatients().subscribe({
      next: (res: any) => {
        // Handle paginated or direct list response
        const list = res.data || res.users || (Array.isArray(res) ? res : []);
        this.patients.set(list);
      },
      error: () => this.patients.set([]),
    });
  }

  onDoctorOrDateChange(): void {
    const { doctorId, appointmentDate } = this.model();
    if (!doctorId || !appointmentDate) return;

    this.isLoadingSlots.set(true);
    this.receptionistService.listDoctorAvailability(appointmentDate).subscribe({
      next: (docs) => {
        const docAvailability = docs.find(d => d.id === doctorId);
        if (docAvailability) {
          this.availableSlots.set(docAvailability.availability.slots || []);
        } else {
          this.availableSlots.set([]);
          this.toast.warning('No availability found for this doctor on selected date.');
        }
        this.isLoadingSlots.set(false);
      },
      error: () => {
        this.isLoadingSlots.set(false);
        this.availableSlots.set([]);
        this.toast.error('Failed to load availability.');
      }
    });
  }

  save(): void {
    const payload = this.model();
    if (!payload.patientId || !payload.doctorId || !payload.appointmentDate || !payload.appointmentTime) {
      this.toast.warning('Please fill in all required fields.');
      return;
    }
    this.isSaving.set(true);
    this.receptionistService.createAppointment(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.success('Appointment booked successfully!');
        this.model.set({ patientId: '', doctorId: '', appointmentDate: '', appointmentTime: '', notes: '' });
        this.router.navigate(['/receptionist/dashboard']);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.error(err.error?.message || 'Failed to book appointment.');
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/receptionist/dashboard']);
  }
}
