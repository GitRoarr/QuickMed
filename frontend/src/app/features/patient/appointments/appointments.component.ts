import { Component, OnInit, signal } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Router } from "@angular/router"
import { SidebarComponent } from "@app/shared/components/sidebar/sidebar.component"
import { AppointmentService } from "@core/services/appointment.service"
import { Appointment } from "@core/models/appointment.model"

interface AppointmentFilter {
  status: string
  dateRange: string
  doctor: string
}


@Component({
  selector: "app-patient-appointments",
  standalone: true,
  imports: [CommonModule, SidebarComponent, FormsModule],
  templateUrl: "./appointments.component.html",
  styleUrls: ["./appointments.component.css"],
})



export class AppointmentsComponent implements OnInit {
  appointments: Appointment[] = []
  filteredAppointments: Appointment[] = []
  isLoading = signal(true)
  searchQuery = signal('')
  selectedFilter = signal('all')
  showFilters = signal(false)
  sortBy = signal('date')
  sortOrder = signal('desc')

  menuItems = [
    { label: "Dashboard", icon: "bi-house", route: "/patient/dashboard" },
    { label: "My Appointments", icon: "bi-calendar-check", route: "/patient/appointments" },
    { label: "Find Doctors", icon: "bi-people", route: "/patient/doctors" },
    { label: "Medical Records", icon: "bi-file-medical", route: "/patient/records" },
    { label: "Prescriptions", icon: "bi-prescription", route: "/patient/prescriptions" },
  ]

  filterOptions = [
    { value: 'all', label: 'All Appointments', icon: 'bi-list' },
    { value: 'pending', label: 'Pending', icon: 'bi-clock' },
    { value: 'confirmed', label: 'Confirmed', icon: 'bi-check-circle' },
    { value: 'completed', label: 'Completed', icon: 'bi-check2-all' },
    { value: 'cancelled', label: 'Cancelled', icon: 'bi-x-circle' },
  ]

  sortOptions = [
    { value: 'date', label: 'Date' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'status', label: 'Status' },
    { value: 'time', label: 'Time' },
  ]

  constructor(
    private appointmentService: AppointmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAppointments()
  }

  loadAppointments(): void {
    this.isLoading.set(true)
    this.appointmentService.getMyAppointments().subscribe({
      next: (data) => {
        this.appointments = data
        this.filteredAppointments = [...data]
        this.applyFilters()
        this.isLoading.set(false)
      },
      error: () => {
        this.isLoading.set(false)
      },
    })
  }

  applyFilters(): void {
    let filtered = [...this.appointments]

    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase()
      filtered = filtered.filter(appointment => 
        appointment.doctor?.firstName?.toLowerCase().includes(query) ||
        appointment.doctor?.lastName?.toLowerCase().includes(query) ||
        appointment.doctor?.specialty?.toLowerCase().includes(query) ||
        appointment.notes?.toLowerCase().includes(query)
      )
    }

    if (this.selectedFilter() !== 'all') {
      filtered = filtered.filter(appointment => 
        appointment.status === this.selectedFilter()
      )
    }

    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (this.sortBy()) {
        case 'date':
          comparison = new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
          break
        case 'doctor':
          const doctorA = `${a.doctor?.firstName} ${a.doctor?.lastName}`.toLowerCase()
          const doctorB = `${b.doctor?.firstName} ${b.doctor?.lastName}`.toLowerCase()
          comparison = doctorA.localeCompare(doctorB)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'time':
          comparison = a.appointmentTime.localeCompare(b.appointmentTime)
          break
      }

      return this.sortOrder() === 'desc' ? -comparison : comparison
    })

    this.filteredAppointments = filtered
  }

  onSearchChange(): void {
    this.applyFilters()
  }
  onFilterChange(): void {
    this.applyFilters()
  }

  onSortChange(): void {
    this.applyFilters()
  }

  toggleSortOrder(): void {
    this.sortOrder.update(order => order === 'asc' ? 'desc' : 'asc')
    this.applyFilters()
  }

  toggleFilters(): void {
    this.showFilters.update(show => !show)
  }

  cancelAppointment(id: string): void {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      this.appointmentService.cancel(id).subscribe({
        next: () => {
          this.loadAppointments()
          this.showSuccessNotification('Appointment cancelled successfully')
        },
        error: () => {
          this.showErrorNotification('Failed to cancel appointment')
        }
      })
    }
  }

  rescheduleAppointment(appointment: Appointment): void {
    this.router.navigate(['/patient/appointments/reschedule', appointment.id])
  }

  viewAppointmentDetails(appointment: Appointment): void {
    this.router.navigate(['/patient/appointments', appointment.id])
  }

  bookNewAppointment(): void {
    this.router.navigate(['/patient/appointments/new'])
  }

  getStatusClass(status: string): string {
    switch (status) {
      case "confirmed":
        return "status-badge confirmed"
      case "pending":
        return "status-badge pending"
      case "cancelled":
        return "status-badge cancelled"
      case "completed":
        return "status-badge completed"
      default:
        return "status-badge default"
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case "confirmed":
        return "bi-check-circle"
      case "pending":
        return "bi-clock"
      case "cancelled":
        return "bi-x-circle"
      case "completed":
        return "bi-check2-all"
      default:
        return "bi-question-circle"
    }
  }

  getUpcomingAppointments(): Appointment[] {
    const today = new Date()
    return this.filteredAppointments.filter(appointment => 
      new Date(appointment.appointmentDate) >= today && 
      appointment.status !== 'cancelled' && 
      appointment.status !== 'completed'
    ).slice(0, 3)
  }

  getAppointmentStats() {
    const total = this.appointments.length
    const pending = this.appointments.filter(a => a.status === 'pending').length
    const confirmed = this.appointments.filter(a => a.status === 'confirmed').length
    const completed = this.appointments.filter(a => a.status === 'completed').length
    const cancelled = this.appointments.filter(a => a.status === 'cancelled').length

    return { total, pending, confirmed, completed, cancelled }
  }

  showSuccessNotification(message: string): void {
    // Implementation for success notification
    console.log('Success:', message)
  }

  showErrorNotification(message: string): void {
    // Implementation for error notification
    console.log('Error:', message)
  }
}
