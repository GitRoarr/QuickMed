import { Component,  OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { SidebarComponent } from "@app/shared/components/sidebar/sidebar.component"
import  { AppointmentService } from "@core/services/appointment.service"
import {  Appointment, AppointmentStatus } from "@core/models/appointment.model"

@Component({
  selector: "app-doctor-appointments",
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: "./appointments.component.html",
  styleUrls: ["./appointments.component.css"],
})
export class AppointmentsComponent implements OnInit {
  appointments: Appointment[] = []
  isLoading = true
  AppointmentStatus = AppointmentStatus

  menuItems = [
    { label: "Dashboard", icon: "bi-house", route: "/doctor/dashboard" },
    { label: "Appointments", icon: "bi-calendar-check", route: "/doctor/appointments" },
  ]

  constructor(private appointmentService: AppointmentService) {}

  ngOnInit(): void {
    this.loadAppointments()
  }

  loadAppointments(): void {
    this.appointmentService.getMyAppointments().subscribe({
      next: (data) => {
        this.appointments = data
        this.isLoading = false
      },
      error: () => {
        this.isLoading = false
      },
    })
  }

  updateStatus(id: string, status: AppointmentStatus): void {
    this.appointmentService.update(id, { status }).subscribe({
      next: () => {
        this.loadAppointments()
      },
    })
  }

  getStatusClass(status: string): string {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return "badge bg-success"
      case AppointmentStatus.PENDING:
        return "badge bg-warning"
      case AppointmentStatus.CANCELLED:
        return "badge bg-danger"
      case AppointmentStatus.COMPLETED:
        return "badge bg-secondary"
      default:
        return "badge bg-secondary"
    }
  }
}
