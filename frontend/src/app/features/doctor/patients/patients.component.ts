import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DoctorPatientSummary, DoctorService } from '@core/services/doctor.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-doctor-patients',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.css']
})
export class PatientsComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private authService = inject(AuthService);

  patients = signal<DoctorPatientSummary[]>([]);
  isLoading = signal(true);

  menuItems = [
    { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
    { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments' },
    { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
    { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
    { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/doctor/records' },
    { label: 'Prescriptions', icon: 'bi-prescription2', route: '/doctor/prescriptions' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages' },
    { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
    { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
  ];

  currentUser = this.authService.currentUser();

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients() {
    this.isLoading.set(true);
    this.doctorService.getMyPatients().subscribe({
      next: (data) => {
        this.patients.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load patients', err);
        this.patients.set([]);
        this.isLoading.set(false);
      }
    });
  }

  getFullName(p: DoctorPatientSummary) {
    return `${p.firstName || ''} ${p.lastName || ''}`.trim();
  }
}
