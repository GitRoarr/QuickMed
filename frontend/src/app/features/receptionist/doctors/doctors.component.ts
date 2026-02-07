import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-receptionist-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, HeaderComponent, SidebarComponent],
  templateUrl: './doctors.component.html',
  styleUrls: ['./doctors.component.css'],
})
export class ReceptionistDoctorsComponent implements OnInit {
  private readonly receptionistService = inject(ReceptionistService);
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
    { label: 'Logout', icon: 'bi-box-arrow-right', action: () => this.authService.logout() },
  ];

  dateFilter = signal(new Date().toISOString().split('T')[0]);
  doctors = signal<any[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.loadAvailability();
  }

  loadAvailability(): void {
    this.loading.set(true);
    this.receptionistService.listDoctorAvailability(this.dateFilter()).subscribe({
      next: (list) => {
        this.doctors.set(list || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
