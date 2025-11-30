import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { PrescriptionService, Prescription } from '@core/services/prescription.service';
import { AppointmentService } from '@core/services/appointment.service';
import { MessageService } from '@core/services/message.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}


@Component({
  selector: 'app-doctor-prescriptions',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './prescriptions.component.html',
  styleUrls: ['./prescriptions.component.css']
})
export class PrescriptionsComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private prescriptionService = inject(PrescriptionService);

  prescriptions = signal<Prescription[]>([]);
  filteredPrescriptions = signal<Prescription[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  currentUser = signal<any>(null);

  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
    { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: 5 },
    { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
    { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
    { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/doctor/records' },
    { label: 'Prescriptions', icon: 'bi-prescription2', route: '/doctor/prescriptions' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: 3 },
    { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
    { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
  ];

  ngOnInit(): void {
    this.loadUserData();
    this.loadPrescriptions();
    this.loadBadgeCounts();
  }

  loadBadgeCounts(): void {
    this.appointmentService.getPendingCount().subscribe({
      next: (data) => {
        this.updateMenuItems(data.count || 0, this.messageService.getUnreadCount() ? 0 : 0);
      }
    });

    this.messageService.getUnreadCount().subscribe({
      next: (data) => {
        this.appointmentService.getPendingCount().subscribe({
          next: (aptData) => {
            this.updateMenuItems(aptData.count || 0, data.count || 0);
          }
        });
      }
    });
  }

  updateMenuItems(appointmentCount: number, messageCount: number): void {
    this.menuItems.set([
      { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
      { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: appointmentCount > 0 ? appointmentCount : undefined },
      { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
      { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
      { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/doctor/records' },
      { label: 'Prescriptions', icon: 'bi-prescription2', route: '/doctor/prescriptions' },
      { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: messageCount > 0 ? messageCount : undefined },
      { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
      { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
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
      error: (error) => {
        console.error('Error loading prescriptions:', error);
        this.isLoading.set(false);
      }
    });
  }

  getDoctorName(): string {
    const user = this.currentUser();
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Doctor';
  }

  getDoctorSpecialty(): string {
    const user = this.currentUser();
    return user?.specialty || 'General Practitioner';
  }

  getDoctorInitials(): string {
    const name = this.getDoctorName();
    if (!name) return 'DR';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  onSearchChange(): void {
    this.loadPrescriptions();
  }

  viewPrescription(prescription: Prescription): void {
    console.log('View prescription:', prescription);
    // Navigate to prescription details
  }

  downloadPrescription(prescription: Prescription): void {
    console.log('Download prescription:', prescription);
    // Implement download logic - could generate PDF
  }

  getPatientName(prescription: Prescription): string {
    if (prescription.patient) {
      return `${prescription.patient.firstName} ${prescription.patient.lastName}`;
    }
    return 'Unknown Patient';
  }

  createNewPrescription(): void {
    console.log('Create new prescription');
    // Navigate to create prescription form
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
