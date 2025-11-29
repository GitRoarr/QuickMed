import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { Appointment as AppointmentModel } from '../../../core/models/appointment.model';
import { PayButtonComponent } from '../../../shared/components/pay-button/pay-button.component';

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
  imports: [CommonModule, FormsModule, RouterModule, PayButtonComponent],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.css']
})
export class AppointmentsComponent implements OnInit {
  appointments = signal<AppointmentModel[]>([]);
  filteredAppointments = signal<AppointmentModel[]>([]);
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

  constructor(private router: Router, private appointmentService: AppointmentService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading.set(true);

    this.appointmentService.getMyAppointments().subscribe({
      next: (apts) => {
        this.appointments.set(apts as AppointmentModel[]);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load appointments', err);
        this.appointments.set([]);
        this.filteredAppointments.set([]);
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.appointments()];

    if (this.selectedFilter() !== 'all') {
      filtered = filtered.filter((apt) => apt.status === this.selectedFilter());
    }

    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter((apt) => {
        const doctorName = `${apt.doctor?.firstName ?? ''} ${apt.doctor?.lastName ?? ''}`.toLowerCase();
        const specialty = (apt.doctor?.specialty ?? '').toLowerCase();
        return (
          doctorName.includes(query) ||
          specialty.includes(query) ||
          (apt.location ?? '').toLowerCase().includes(query) ||
          (apt.notes ?? '').toLowerCase().includes(query)
        );
      });
    }

    filtered = this.sortAppointments(filtered);
    this.filteredAppointments.set(filtered);
  }

  sortAppointments(appointments: AppointmentModel[]): AppointmentModel[] {
    const sorted = [...appointments];
    const order = this.sortOrder() === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      switch (this.sortBy()) {
        case 'date':
          return order * (new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
        case 'doctor': {
          const nameA = `${a.doctor?.firstName ?? ''} ${a.doctor?.lastName ?? ''}`.trim();
          const nameB = `${b.doctor?.firstName ?? ''} ${b.doctor?.lastName ?? ''}`.trim();
          return order * nameA.localeCompare(nameB);
        }
        case 'status':
          return order * (a.status ?? '').localeCompare(b.status ?? '');
        case 'time':
          return order * (a.appointmentTime ?? '').localeCompare(b.appointmentTime ?? '');
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
  goHome(){
    this.router.navigate(['/']);
  }
}
