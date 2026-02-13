import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-receptionist-patient-form',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertMessageComponent, HeaderComponent, SidebarComponent],
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.css'],
})
export class PatientFormComponent implements OnInit {
  private readonly receptionistService = inject(ReceptionistService);
  private readonly router = inject(Router);
  public readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);

  menuItems = [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/receptionist/dashboard', exact: true },
    { label: 'Appointments', icon: 'bi-calendar-check', route: '/receptionist/appointments' },
    { label: 'Patients', icon: 'bi-people', route: '/receptionist/patients' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/receptionist/messages' },
    { label: 'Payments', icon: 'bi-cash-stack', route: '/receptionist/payments' },
    { label: 'Doctors',
      iconImgLight: 'https://img.icons8.com/?size=100&id=60999&format=png&color=000000',
      iconImgDark: 'https://img.icons8.com/?size=100&id=60999&format=png&color=4e91fd',
      route: '/receptionist/doctors' },
    { label: 'Reports', icon: 'bi-bar-chart', route: '/receptionist/reports' },
  ];

  secondaryItems = [
    { label: 'Settings', icon: 'bi-gear', route: '/receptionist/settings' },
    { label: 'Logout', icon: 'bi-box-arrow-right', route: '/receptionist/logout' },
  ];

  model = signal<any>({ firstName: '', lastName: '', email: '', phoneNumber: '', dateOfBirth: '', medicalHistory: '' });
  isSaving = signal(false);
  message = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  ngOnInit(): void { }

  save(): void {
    const payload = { ...this.model() };
    if (!payload.firstName || !payload.lastName || !payload.email) {
      this.message.set({ type: 'error', text: 'First name, last name and email are required.' });
      return;
    }
    this.isSaving.set(true);
    this.receptionistService.createPatient(payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.message.set({ type: 'success', text: 'Patient created. Temporary password was sent.' });
        this.model.set({ firstName: '', lastName: '', email: '', phoneNumber: '', dateOfBirth: '', medicalHistory: '' });
        // Optionally redirect after a short delay
        setTimeout(() => this.router.navigate(['/receptionist/dashboard']), 1500);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.message.set({ type: 'error', text: err.error?.message || 'Failed to create patient' });
      },
    });
  }
}
