import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '@app/shared/components/sidebar/sidebar.component';
import { Router } from '@angular/router';

interface Appointment {
  id: string;
  doctor: { firstName: string; lastName: string; specialty: string };
  appointmentDate: string;
  appointmentTime: string;
  location?: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  isVideoConsultation?: boolean;
  notes?: string;
}

@Component({
  selector: 'app-patient-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.css']
})
export class AppointmentsComponent implements OnInit {
  appointments = signal<Appointment[]>([]);
  filteredAppointments = signal<Appointment[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  selectedFilter = signal('all');
  showFilters = signal(false);
  sortBy = signal('date');
  sortOrder = signal('desc');
  sidebarCollapsed = signal(false);

  menuItems = [
    { label: 'Dashboard', icon: 'bi-house', route: '/patient/dashboard', active: false },
    { label: 'My Appointments', icon: 'bi-calendar-check', route: '/patient/appointments', active: true },
    { label: 'Find Doctors', icon: 'bi-people', route: '/patient/doctors', active: false },
    { label: 'Medical Records', icon: 'bi-file-medical', route: '/patient/records', active: false },
    { label: 'Prescriptions', icon: 'bi-prescription', route: '/patient/prescriptions', active: false }
  ];

  filterOptions = [
    { value: 'all', label: 'All Appointments', icon: 'bi-list' },
    { value: 'pending', label: 'Pending', icon: 'bi-clock' },
    { value: 'confirmed', label: 'Confirmed', icon: 'bi-check-circle' },
    { value: 'completed', label: 'Completed', icon: 'bi-check2-all' },
    { value: 'cancelled', label: 'Cancelled', icon: 'bi-x-circle' }
  ];

  sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'status', label: 'Status' },
    { value: 'time', label: 'Time' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    
    setTimeout(() => {
      const mockAppointments: Appointment[] = [
        {
          id: '1',
          doctor: { firstName: 'Michael', lastName: 'Chen', specialty: 'Cardiologist' },
          appointmentDate: '2025-10-16',
          appointmentTime: '10:00 AM',
          location: 'Building A, Room 302',
          status: 'confirmed',
          isVideoConsultation: false,
          notes: 'Follow-up checkup'
        },
        {
          id: '2',
          doctor: { firstName: 'Emily', lastName: 'Rodriguez', specialty: 'General Physician' },
          appointmentDate: '2025-10-20',
          appointmentTime: '2:30 PM',
          location: 'Video Consultation',
          status: 'confirmed',
          isVideoConsultation: true,
          notes: 'Annual physical exam'
        },
        {
          id: '3',
          doctor: { firstName: 'James', lastName: 'Wilson', specialty: 'Dermatologist' },
          appointmentDate: '2025-10-25',
          appointmentTime: '11:15 AM',
          location: 'Building B, Room 105',
          status: 'pending',
          isVideoConsultation: false,
          notes: 'Skin consultation'
        },
        {
          id: '4',
          doctor: { firstName: 'Sarah', lastName: 'Martinez', specialty: 'Orthopedist' },
          appointmentDate: '2025-09-10',
          appointmentTime: '9:00 AM',
          location: 'Building C, Room 201',
          status: 'completed',
          isVideoConsultation: false
        },
        {
          id: '5',
          doctor: { firstName: 'David', lastName: 'Lee', specialty: 'Pediatrician' },
          appointmentDate: '2025-09-05',
          appointmentTime: '3:00 PM',
          location: 'Building A, Room 105',
          status: 'cancelled',
          isVideoConsultation: false
        }
      ];

      this.appointments.set(mockAppointments);
      this.filteredAppointments.set(mockAppointments);
      this.applyFilters();
      this.isLoading.set(false);
    }, 1000);
  }

  applyFilters(): void {
    let filtered = [...this.appointments()];

    if (this.selectedFilter() !== 'all') {
      filtered = filtered.filter(apt => apt.status === this.selectedFilter());
    }

    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(apt =>
        `${apt.doctor.firstName} ${apt.doctor.lastName}`.toLowerCase().includes(query) ||
        apt.doctor.specialty.toLowerCase().includes(query) ||
        apt.location?.toLowerCase().includes(query) ||
        apt.notes?.toLowerCase().includes(query)
      );
    }

    filtered = this.sortAppointments(filtered);
    this.filteredAppointments.set(filtered);
  }

  sortAppointments(appointments: Appointment[]): Appointment[] {
    const sorted = [...appointments];
    const order = this.sortOrder() === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      switch (this.sortBy()) {
        case 'date':
          return order * (new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
        case 'doctor':
          return order * `${a.doctor.firstName} ${a.doctor.lastName}`.localeCompare(`${b.doctor.firstName} ${b.doctor.lastName}`);
        case 'status':
          return order * a.status.localeCompare(b.status);
        case 'time':
          return order * a.appointmentTime.localeCompare(b.appointmentTime);
        default:
          return 0;
      }
    });

    return sorted;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  setFilter(filter: string): void {
    this.selectedFilter.set(filter);
    this.applyFilters();
  }

  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  setSortBy(sortBy: string): void {
    if (this.sortBy() === sortBy) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(sortBy);
      this.sortOrder.set('desc');
    }
    this.applyFilters();
  }

  getAppointmentStats() {
    const all = this.appointments();
    return {
      total: all.length,
      pending: all.filter(a => a.status === 'pending').length,
      confirmed: all.filter(a => a.status === 'confirmed').length,
      completed: all.filter(a => a.status === 'completed').length
    };
  }

  bookNewAppointment(): void {
    this.router.navigate(['/patient/doctors']);
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

  viewDetails(appointmentId: string): void {
    console.log('View details:', appointmentId);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }
}
