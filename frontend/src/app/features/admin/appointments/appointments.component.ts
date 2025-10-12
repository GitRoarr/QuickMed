import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { SidebarComponent } from "@app/shared/components/sidebar/sidebar.component"
import { AppointmentService } from "@core/services/appointment.service"
import { Appointment } from "@core/models/appointment.model"

@Component({
  selector: "app-admin-appointments",
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: "./appointments.component.html",
  styleUrls: ["./appointments.component.css"],
})
export class AppointmentsComponent implements OnInit {
  appointments: Appointment[] = []
  isLoading = true

  menuItems = [
    { label: "Dashboard", icon: "bi-house", route: "/admin/dashboard" },
    { label: "Doctors", icon: "bi-people", route: "/admin/doctors" },
    { label: "Appointments", icon: "bi-calendar-check", route: "/admin/appointments" },
  ]

  constructor(private appointmentService: AppointmentService) {}

  ngOnInit(): void {
    this.loadAppointments()
  }

  loadAppointments(): void {
    this.appointmentService.getAll().subscribe({
      next: (data) => {
        this.appointments = data
        this.isLoading = false
      },
      error: () => {
        this.isLoading = false
      },
    })
  }

  deleteAppointment(id: string): void {
    if (confirm("Are you sure you want to delete this appointment?")) {
      this.appointmentService.delete(id).subscribe({
        next: () => {
          this.loadAppointments()
        },
      })
    }
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
