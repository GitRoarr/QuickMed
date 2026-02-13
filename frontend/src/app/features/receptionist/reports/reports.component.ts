import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { DoctorService, DoctorListItem } from '@app/core/services/doctor.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-receptionist-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, CurrencyPipe, HeaderComponent, SidebarComponent],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
})
export class ReceptionistReportsComponent implements OnInit {
  private readonly receptionistService = inject(ReceptionistService);
  private readonly doctorService = inject(DoctorService);
  authService = inject(AuthService);

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
    { label: 'Logout', icon: 'bi-box-arrow-right', route: '/receptionist/logout' },
  ];

  reportType = signal<'daily' | 'appointments' | 'patients' | 'payments' | 'doctors' | 'no-shows'>('daily');
  startDate = signal(new Date().toISOString().split('T')[0]);
  endDate = signal(new Date().toISOString().split('T')[0]);
  doctorId = signal<string>('');
  status = signal<string>('');

  daily = signal<any>(null);
  appointmentRows = signal<any[]>([]);
  patientVisit = signal<any>(null);
  paymentReport = signal<any>(null);
  doctorActivity = signal<any[]>([]);
  noShows = signal<any[]>([]);
  doctors = signal<DoctorListItem[]>([]);

  ngOnInit(): void {
    this.loadDoctors();
    this.loadReports();
  }

  loadDoctors(): void {
    this.doctorService.listDoctors().subscribe({
      next: (list) => this.doctors.set(list || []),
      error: () => this.doctors.set([]),
    });
  }

  loadReports(): void {
    const type = this.reportType();
    if (type === 'daily') {
      this.receptionistService.getDailyReport(this.startDate()).subscribe({
        next: (data) => this.daily.set(data),
      });
    }
    if (type === 'appointments') {
      this.receptionistService.getAppointmentReport({
        startDate: this.startDate(),
        endDate: this.endDate(),
        doctorId: this.doctorId() || undefined,
        status: this.status() || undefined,
      }).subscribe({
        next: (list) => this.appointmentRows.set(list || []),
      });
    }
    if (type === 'patients') {
      this.receptionistService.getPatientVisitReport({
        startDate: this.startDate(),
        endDate: this.endDate(),
      }).subscribe({
        next: (data) => this.patientVisit.set(data),
      });
    }
    if (type === 'payments') {
      this.receptionistService.getPaymentReport({
        startDate: this.startDate(),
        endDate: this.endDate(),
      }).subscribe({
        next: (data) => this.paymentReport.set(data),
      });
    }
    if (type === 'doctors') {
      this.receptionistService.getDoctorActivityReport({
        startDate: this.startDate(),
        endDate: this.endDate(),
      }).subscribe({
        next: (list) => this.doctorActivity.set(list || []),
      });
    }
    if (type === 'no-shows') {
      this.receptionistService.getNoShowReport({
        startDate: this.startDate(),
        endDate: this.endDate(),
      }).subscribe({
        next: (list) => this.noShows.set(list || []),
      });
    }
  }
}
