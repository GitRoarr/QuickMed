import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterLink } from "@angular/router"
import { SidebarComponent } from "@app/shared/components/sidebar/sidebar.component"
import { AppointmentService } from "@core/services/appointment.service"
import { Appointment } from "@core/models/appointment.model"
import { FilterPipe } from "@app/shared/pipes/filter.pipe"

@Component({
  selector: "app-patient-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent, FilterPipe],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent implements OnInit {
  appointments: Appointment[] = []
  isLoading = true

  menuItems = [
    { label: "Dashboard", icon: "bi-house", route: "/patient/dashboard" },
    { label: "My Appointments", icon: "bi-calendar-check", route: "/patient/appointments" },
    { label: "Find Doctors", icon: "bi-people", route: "/patient/doctors" },
  ]

  constructor(private appointmentService: AppointmentService) {}

  ngOnInit(): void {
    this.loadAppointments()
  }

  loadAppointments(): void {
    this.appointmentService.getMyAppointments().subscribe({
      next: (data) => {
        this.appointments = data.slice(0, 5) // Show only recent 5
        this.isLoading = false
      },
      error: () => {
        this.isLoading = false
      },
    })
  }

  getStatusClass(status: string): string {
    switch (status) {
      case "confirmed":
        return "badge bg-success"
      case "pending":
        return "badge bg-warning"
      case "cancelled":
        return "badge bg-danger"
      case "completed":
        return "badge bg-secondary"
      default:
        return "badge bg-secondary"
    }
  }
}
