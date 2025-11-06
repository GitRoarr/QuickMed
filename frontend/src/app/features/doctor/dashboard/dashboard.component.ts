import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { AppointmentService } from "@core/services/appointment.service"
import { Appointment } from "@core/models/appointment.model"
import  { ThemeService } from "@core/services/theme.service"

interface AppointmentData {
  id: number
  time: string
  patient: string
  age: number
  type: string
  status: string
  reason: string
  duration: string
}

@Component({
  selector: "app-doctor-dashboard",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent implements OnInit {
  appointments: Appointment[] = []
  isLoading = true
  activeTab = "schedule"
  currentDate = new Date()
  isDarkMode = false

  // Doctor info (would come from auth service in real app)
  doctorName = "Michael Chen"
  doctorSpecialty = "Cardiologist"
  doctorDepartment = "Cardiology Department"
  doctorLicense = "MD-12345"

  todayAppointments: AppointmentData[] = [
    {
      id: 1,
      time: "09:00 AM",
      patient: "Sarah Johnson",
      age: 38,
      type: "Follow-up",
      status: "completed",
      reason: "Hypertension checkup",
      duration: "30 min",
    },
  ]

  todayStats = {
    totalAppointments: 12,
    completed: 7,
    pending: 3,
    patients: 12,
    cancelled: 2,
  }

  weekStats = {
    totalPatients: 48,
    consultations: 52,
    reportsPending: 8,
  }

  constructor(
    private appointmentService: AppointmentService,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.loadAppointments()
    this.isDarkMode = this.themeService.isDarkMode()
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

  toggleTheme(): void {
    this.themeService.toggleTheme()
    this.isDarkMode = this.themeService.isDarkMode()
  }

  getTodayTotal(): number {
    return this.todayStats.totalAppointments
  }

  getCompletedCount(): number {
    return this.todayStats.completed
  }

  getPendingCount(): number {
    return this.todayStats.pending
  }

  getPatientCount(): number {
    return this.todayStats.patients
  }

  getCancelledCount(): number {
    return this.todayStats.cancelled
  }

  getInitials(name: string): string {
    if (!name) return "??"
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      completed: "status-completed",
      waiting: "status-waiting",
      scheduled: "status-scheduled",
      "in-progress": "status-in-progress",
      cancelled: "status-cancelled",
      pending: "status-pending",
    }
    return statusMap[status] || "status-pending"
  }

  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      completed: "bi bi-check-circle",
      waiting: "bi bi-clock",
      scheduled: "bi bi-calendar-check",
      "in-progress": "bi bi-activity",
      cancelled: "bi bi-x-circle",
      pending: "bi bi-hourglass",
    }
    return iconMap[status] || "bi bi-hourglass"
  }

  startConsultation(appointment: Appointment): void {
    console.log("[v0] Starting consultation for:", appointment)
    // Implementation for starting consultation
  }

  joinVideoCall(appointment: Appointment): void {
    console.log("[v0] Joining video call for:", appointment)
    // Implementation for video call
  }

  viewRecords(appointment: Appointment): void {
    console.log("[v0] Viewing records for:", appointment)
  }

  addNotes(appointment: Appointment): void {
    console.log("[v0] Adding notes for:", appointment)
  }
}
