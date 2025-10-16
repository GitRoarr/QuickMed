import { Component,  OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterLink } from "@angular/router"
import  { AppointmentService } from "@core/services/appointment.service"
import  { AuthService } from "@core/services/auth.service"
import  { Appointment } from "@core/models/appointment.model"
import  { ThemeService } from "@core/services/theme.service"
import  { User } from "@core/models/user.model"

@Component({
  selector: "app-patient-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent implements OnInit {
  appointments: Appointment[] = []
  isLoading = true
  activeTab = "appointments"
  currentUser: User | null = null
  upcomingCount = 0

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser()
    this.loadAppointments()
  }

  loadCurrentUser(): void {
    this.currentUser = this.authService.currentUser()
  }

  loadAppointments(): void {
    this.appointmentService.getMyAppointments().subscribe({
      next: (data) => {
        this.appointments = data.filter((apt) => apt.status === "confirmed" || apt.status === "pending")
        this.upcomingCount = this.appointments.length
        this.isLoading = false
      },
      error: (error: any) => {
        console.error("Error loading appointments:", error)
        this.isLoading = false
      },
    })
  }

  getInitials(user: any): string {
    if (!user) return "?"
    const firstInitial = user.firstName?.charAt(0) || ""
    const lastInitial = user.lastName?.charAt(0) || ""
    return (firstInitial + lastInitial).toUpperCase()
  }

  toggleTheme(): void {
    this.themeService.toggleTheme()
  }
}
