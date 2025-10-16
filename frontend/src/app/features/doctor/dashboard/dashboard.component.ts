import { Component,  OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import  { AppointmentService } from "@core/services/appointment.service"
import  { Appointment } from "@core/models/appointment.model"
import  { ThemeService } from "@core/services/theme.service"
import { AppointmentStatus } from "@core/models/appointment.model"

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
    return this.appointments.length
  }

  getCompletedCount(): number {
    return this.appointments.filter((a) => a.status === "completed").length
  }

  getPendingCount(): number {
    return this.appointments.filter(
      (a) => a.status === AppointmentStatus.PENDING || a.status === AppointmentStatus.CONFIRMED!,
    ).length
  }

  getPatientCount(): number {
    const uniquePatients = new Set(this.appointments.map((a) => a.patientId))
    return uniquePatients.size
  }

  getCancelledCount(): number {
    return this.appointments.filter((a) => a.status === "cancelled").length
  }

  getInitials(patient: any): string {
    if (!patient) return "??"
    const first = patient.firstName?.charAt(0) || ""
    const last = patient.lastName?.charAt(0) || ""
    return (first + last).toUpperCase()
  }

  getPatientAge(patient: any): number {
    // Mock age calculation - would use actual birthdate in real app
    return Math.floor(Math.random() * 50) + 20
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
    // Implementation for viewing records
  }

  addNotes(appointment: Appointment): void {
    console.log("[v0] Adding notes for:", appointment)
    // Implementation for adding notes
  }
}
