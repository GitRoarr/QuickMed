import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
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
  
  
  user = signal<User>({
    firstName: 'Sarah',
    lastName: 'Johnson',
    patientId: '#12345',
    email: 'sarah.johnson@email.com',
    phoneNumber: '+1 (555) 123-4567',
    dateOfBirth: 'March 15, 1985',
    bloodType: 'O+',
    allergies: ['Penicillin', 'Peanuts']
  });

  stats = signal<Stats>({
    upcomingAppointments: 3,
    activeMeds: 2,
    records: 12,
    testResults: 3
  });

  appointments = signal<Appointment[]>([
    {
      id: '1',
      doctor: { firstName: 'Michael', lastName: 'Chen', specialty: 'Cardiologist' },
      appointmentDate: '2025-10-16',
      appointmentTime: '10:00 AM',
      location: 'Building A, Room 302',
      status: 'confirmed',
      isVideoConsultation: false
    },
    {
      id: '2',
      doctor: { firstName: 'Emily', lastName: 'Rodriguez', specialty: 'General Physician' },
      appointmentDate: '2025-10-20',
      appointmentTime: '2:30 PM',
      location: 'Video Consultation',
      status: 'confirmed',
      isVideoConsultation: true
    },
    {
      id: '3',
      doctor: { firstName: 'James', lastName: 'Wilson', specialty: 'Dermatologist' },
      appointmentDate: '2025-10-25',
      appointmentTime: '11:15 AM',
      location: 'Building B, Room 105',
      status: 'pending',
      isVideoConsultation: false
    }
  ]);

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

  constructor(public theme: ThemeService, private router: Router) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    setTimeout(() => {
      this.isLoading.set(false);
    }, 1000);
  }
   goHome() {
    this.router.navigate(['/']); // Change '/' if your homepage route is different
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
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
