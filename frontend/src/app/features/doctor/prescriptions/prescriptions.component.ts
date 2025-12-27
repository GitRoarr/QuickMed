import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { AuthService } from '@core/services/auth.service';
import { PrescriptionService, Prescription } from '@core/services/prescription.service';
import { AppointmentService } from '@core/services/appointment.service';
import { MessageService } from '@core/services/message.service';
import { forkJoin } from 'rxjs';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-doctor-prescriptions',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, DoctorHeaderComponent, DoctorSidebarComponent],
  templateUrl: './prescriptions.component.html',
  styleUrls: ['./prescriptions.component.css']
})
export class PrescriptionsComponent implements OnInit {

  private authService = inject(AuthService);
  private router = inject(Router);
  private prescriptionService = inject(PrescriptionService);
  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);

  prescriptions = signal<Prescription[]>([]);
  filteredPrescriptions = signal<Prescription[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  currentUser = signal<any>(null);

  menuItems = signal<MenuItem[]>([]);

  ngOnInit(): void {
    this.loadUserData();
    this.loadPrescriptions();
    this.loadBadgeCounts();
  }

  loadBadgeCounts(): void {
    forkJoin({
      appointments: this.appointmentService.getPendingCount(),
      messages: this.messageService.getUnreadCount()
    }).subscribe(({ appointments, messages }) => {
      this.updateMenuItems(appointments.count || 0, messages.count || 0);
    });
  }

  updateMenuItems(appointmentCount: number, messageCount: number): void {
    this.menuItems.set([
      { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
      { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: appointmentCount || undefined },
      { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
      { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
      { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/doctor/records' },
      { label: 'Prescriptions', route: '/doctor/prescriptions', imgSrc: 'https://img.icons8.com/ios-filled/24/prescription.png' },
      { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: messageCount || undefined },
      { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
      { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' }
    ]);
  }

  loadUserData(): void {
    const user = this.authService.currentUser();
    this.currentUser.set(user);
  }

  loadPrescriptions(): void {
    this.isLoading.set(true);
    this.prescriptionService.getAll(this.searchQuery() || undefined).subscribe({
      next: (data) => {
        this.prescriptions.set(data);
        this.filteredPrescriptions.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.loadPrescriptions();
  }

  getDoctorName(): string {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Doctor';
  }

  getDoctorSpecialty(): string {
    const user = this.currentUser();
    return user?.specialty || 'General Practitioner';
  }

  getDoctorInitials(): string {
    const parts = this.getDoctorName().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : this.getDoctorName().substring(0, 2).toUpperCase();
  }

  getPatientName(p: Prescription): string {
    return p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : 'Unknown Patient';
  }

  viewPrescription(p: Prescription): void {
    console.log('VIEW:', p);
  }

  downloadPrescription(p: Prescription): void {
    console.log('DOWNLOAD:', p);
  }

  createNewPrescription(): void {
    this.router.navigate(['/doctor/prescriptions/create']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
