import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { DoctorService, DoctorListItem } from '@app/core/services/doctor.service';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { AuthService } from '@core/services/auth.service';

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

  model = signal<any>({ patientId: '', doctorId: '', appointmentDate: '', appointmentTime: '', notes: '' });
  isSaving = signal(false);

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
      next: (list) => this.patients.set(list || []),
      error: () => this.patients.set([]),
    });
  }

  save(): void {
    const payload = this.model();
    if (!payload.patientId || !payload.doctorId || !payload.appointmentDate || !payload.appointmentTime) return;
    this.isSaving.set(true);
    this.receptionistService.createAppointment(payload).subscribe({ next: () => { this.isSaving.set(false); this.model.set({ patientId: '', doctorId: '', appointmentDate: '', appointmentTime: '', notes: '' }) }, error: () => this.isSaving.set(false) });
  }
}
