import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { AppointmentService } from '@core/services/appointment.service';
import { MessageService } from '@core/services/message.service';

interface MenuItem {
  label: string;
  icon?: string;
  route: string;
  badge?: number;
  imgSrc?: string; // optional image icon (e.g., Icons8)
}

@Component({
  selector: 'app-doctor-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './doctor-sidebar.component.html',
  styleUrls: ['./doctor-sidebar.component.css']
})
export class DoctorSidebarComponent implements OnInit {
  private authService = inject(AuthService);
  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);

  currentUser = signal<any>(null);
  menuItems = signal<MenuItem[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.currentUser.set(this.authService.currentUser());
    this.loadBadges();
  }

  loadBadges(): void {
    this.appointmentService.getPendingCount().subscribe({
      next: (apt) => {
        this.messageService.getUnreadCount().subscribe({
          next: (msg) => {
            this.updateMenuItems(apt?.count || 0, msg?.count || 0);
            this.loading.set(false);
          },
          error: () => {
            this.updateMenuItems(apt?.count || 0, 0);
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.updateMenuItems(0, 0);
        this.loading.set(false);
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
      { label: 'Prescriptions', route: '/doctor/prescriptions', imgSrc: 'https://img.icons8.com/ios-filled/24/prescription.png' },
      { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: messageCount > 0 ? messageCount : undefined },
      { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
      { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
    ]);
  }

  getDoctorName(): string {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Doctor';
  }

  getDoctorSpecialty(): string {
    return this.currentUser()?.specialty || 'General Practitioner';
  }

  getDoctorInitials(): string {
    const name = this.getDoctorName();
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
  }
}
