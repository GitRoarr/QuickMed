import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  patientName: string;
  patientId: string;
  frequency: string;
  duration: string;
  date: string;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
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
  }

  loadUserData(): void {
    const user = this.authService.currentUser();
    this.currentUser.set(user);
  }

  loadPrescriptions(): void {
    this.isLoading.set(true);
    // Mock data for now - replace with actual API call
    setTimeout(() => {
      const mockPrescriptions: Prescription[] = [
        {
          id: '1',
          medication: 'Lisinopril',
          dosage: '10mg',
          patientName: 'John Doe',
          patientId: 'p1',
          frequency: 'Once daily',
          duration: '30 days',
          date: '2025-11-28',
          status: 'active',
          notes: 'Take with food'
        },
        {
          id: '2',
          medication: 'Metformin',
          dosage: '500mg',
          patientName: 'Jane Smith',
          patientId: 'p2',
          frequency: 'Twice daily',
          duration: '90 days',
          date: '2025-11-25',
          status: 'active',
          notes: 'Monitor blood sugar'
        },
        {
          id: '3',
          medication: 'Aspirin',
          dosage: '81mg',
          patientName: 'Mike Johnson',
          patientId: 'p3',
          frequency: 'Once daily',
          duration: 'Ongoing',
          date: '2025-10-15',
          status: 'completed',
          notes: 'Low dose for heart health'
        }
      ];
      this.prescriptions.set(mockPrescriptions);
      this.filteredPrescriptions.set(mockPrescriptions);
      this.isLoading.set(false);
    }, 500);
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
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      this.filteredPrescriptions.set(this.prescriptions());
      return;
    }
    const filtered = this.prescriptions().filter(p =>
      p.patientName.toLowerCase().includes(query) ||
      p.medication.toLowerCase().includes(query) ||
      p.dosage.toLowerCase().includes(query)
    );
    this.filteredPrescriptions.set(filtered);
  }

  viewPrescription(prescription: Prescription): void {
    console.log('View prescription:', prescription);
    // Navigate to prescription details
  }

  downloadPrescription(prescription: Prescription): void {
    console.log('Download prescription:', prescription);
    // Implement download logic
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
