import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

interface PatientNavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-patient-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-shell.component.html',
  styleUrls: ['./patient-shell.component.css'],
})
export class PatientShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  menuItems: PatientNavItem[] = [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/patient/dashboard' },
    { label: 'Appointments', icon: 'bi-calendar3', route: '/patient/appointments' },
    { label: 'Find Doctors', icon: 'bi-people', route: '/patient/doctors' },
    { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/patient/records' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/patient/messages' },
    { label: 'Profile', icon: 'bi-person', route: '/patient/profile' },
    { label: 'Settings', icon: 'bi-gear', route: '/patient/settings' },
  ];

  get user() {
    return this.authService.currentUser();
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    this.authService.logout();
  }
}

