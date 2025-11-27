import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment as AppointmentModel } from '../../../core/models/appointment.model';
import { DataContainerComponent } from '../../../shared/components/data-container/data-container.component';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  bloodType?: string;
  patientId?: string;
  allergies?: string[];
}

interface Appointment {
  id: string;
  doctor: { firstName: string; lastName: string; specialty: string };
  appointmentDate: string;
  appointmentTime: string;
  location?: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  isVideoConsultation?: boolean;
}

interface Stats {
  upcomingAppointments: number;
  activeMeds: number;
  records: number;
  testResults: number;
}

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DataContainerComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  isLoading = signal(true);
  activeTab = signal<'appointments' | 'history' | 'prescriptions' | 'tests'>('appointments');
  searchQuery = signal('');
  sidebarCollapsed = signal(false);
  
  
  user = signal<User | null>(null);

  stats = signal<Stats>({
    upcomingAppointments: 0,
    activeMeds: 0,
    records: 0,
    testResults: 0,
  });

  appointments = signal<AppointmentModel[]>([]);

  menuItems = [
    { icon: 'bi-house', label: 'Dashboard', route: '/patient/dashboard', active: true },
    { icon: 'bi-calendar-check', label: 'Appointments', route: '/patient/appointments', active: false },
    { icon: 'bi-people', label: 'Find Doctors', route: '/patient/doctors', active: false },
    { icon: 'bi-file-medical', label: 'Medical Records', route: '/patient/records', active: false },
    { icon: 'bi-gear', label: 'Settings', route: '/patient/settings', active: false }
  ];

  quickActions = [
    { icon: 'bi-calendar-plus', label: 'Book Appointment' },
    { icon: 'bi-download', label: 'Download Records' },
    { icon: 'bi-capsule', label: 'Request Prescription' },
    { icon: 'bi-telephone', label: 'Contact Support' }
  ];

  constructor(
    public theme: ThemeService,
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private appointmentService: AppointmentService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const current = this.authService.currentUser();

    if (current && current.id) {
      this.userService.getOne(current.id).subscribe({
        next: (u) => {
          this.user.set(u as any);
          this.stats.update((s) => ({
            ...s,
            activeMeds: (u as any).activeMedicationsCount ?? s.activeMeds,
            records: (u as any).medicalRecordsCount ?? s.records,
            testResults: (u as any).testResultsCount ?? s.testResults,
          }));
        },
        error: (err) => {
          console.error('Failed to load user profile', err);
        },
      });

      // fetch appointments for current user
      this.appointmentService.getMyAppointments().subscribe({
        next: (apts) => {
          this.appointments.set(apts as AppointmentModel[]);
          this.stats.update((s) => ({ ...s, upcomingAppointments: apts.length }));
        },
        error: (err) => console.error('Failed to load appointments', err),
      });
    } else {
      // fallback: try to fetch current user from storage
      const storedUser = this.authService.currentUser();
      if (storedUser && storedUser.id) {
        this.userService.getOne(storedUser.id).subscribe({ next: (u) => this.user.set(u) });
      }

      this.appointmentService.getMyAppointments().subscribe({
        next: (apts) => {
          this.appointments.set(apts as AppointmentModel[]);
          this.stats.update((s) => ({ ...s, upcomingAppointments: apts.length }));
        },
        error: (err) => console.error('Failed to load appointments', err),
      });
    }

    setTimeout(() => this.isLoading.set(false), 400);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }
  goHome(){
    this.router.navigate(['/']);
  }

  toggleTheme(): void {
    this.theme.toggleTheme();
  }

  setActiveTab(tab: 'appointments' | 'history' | 'prescriptions' | 'tests'): void {
    this.activeTab.set(tab);
  }

  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName || !lastName) return 'SJ';
    return `${firstName[0]}${lastName[0]}`;
  }

  callEmergency(): void {
    window.location.href = 'tel:911';
  }

  bookAppointment(): void {
    console.log('Book appointment clicked');
  }

  rescheduleAppointment(appointmentId: string): void {
    console.log('Reschedule appointment:', appointmentId);
  }

  cancelAppointment(appointmentId: string): void {
    console.log('Cancel appointment:', appointmentId);
  }

  joinVideoCall(appointmentId: string): void {
    console.log('Join video call:', appointmentId);
  }

  editProfile(): void {
    console.log('Edit profile clicked');
  }

  quickAction(action: string): void {
    console.log('Quick action:', action);
  }

  logout(): void {
    console.log('Logout clicked');
  }
}
