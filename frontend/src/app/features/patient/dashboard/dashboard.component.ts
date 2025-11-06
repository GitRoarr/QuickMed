// dashboard.component.ts
import { Component,  OnInit, signal } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterLink,  Router } from "@angular/router"
import { FormsModule } from "@angular/forms"
import  { AppointmentService } from "@core/services/appointment.service"
import  { AuthService } from "@core/services/auth.service"
import  { Appointment } from "@core/models/appointment.model"
import  { User } from "@core/models/user.model"
import { NotificationCenterComponent } from "@app/shared/components/notification-center/notification-center.component"

interface DashboardStats {
  upcomingAppointments: number
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  medicalRecords: number
  prescriptions: number
  testResults: number
}

interface MedicalRecord {
  id: number
  date: string
  doctor: string
  diagnosis: string
  notes: string
}

interface Prescription {
  id: number
  medication: string
  dosage: string
  prescribedBy: string
  startDate: string
  refills: number
  status: "active" | "completed"
}

interface TestResult {
  id: number
  test: string
  date: string
  status: string
  orderedBy: string
}

@Component({
  selector: "app-patient-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NotificationCenterComponent],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent implements OnInit {
  appointments: Appointment[] = []
  filteredAppointments: Appointment[] = []
  isLoading = signal(true)
  activeTab = signal("appointments")
  currentUser: User | null = null
  searchQuery = signal("")
  sidebarCollapsed = signal(false)
  isDarkMode = signal(false)
  showNotifications = signal(false)
  notificationCount = signal(0)

  dashboardStats = signal<DashboardStats>({
    upcomingAppointments: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    medicalRecords: 0,
    prescriptions: 0,
    testResults: 0,
  })

  medicalHistory: MedicalRecord[] = [
    {
      id: 1,
      date: "2025-09-15",
      doctor: "Dr. Michael Chen",
      diagnosis: "Annual Checkup",
      notes: "Blood pressure normal, cholesterol slightly elevated. Recommended dietary changes.",
    },
    {
      id: 2,
      date: "2025-08-03",
      doctor: "Dr. Emily Rodriguez",
      diagnosis: "Seasonal Allergies",
      notes: "Prescribed antihistamines. Follow up if symptoms persist.",
    },
    {
      id: 3,
      date: "2025-06-20",
      doctor: "Dr. James Wilson",
      diagnosis: "Skin Consultation",
      notes: "Minor eczema. Prescribed topical cream. Condition improving.",
    },
  ]

  prescriptions: Prescription[] = [
    {
      id: 1,
      medication: "Lisinopril 10mg",
      dosage: "Once daily",
      prescribedBy: "Dr. Michael Chen",
      startDate: "2025-09-15",
      refills: 3,
      status: "active",
    },
    {
      id: 2,
      medication: "Cetirizine 10mg",
      dosage: "Once daily as needed",
      prescribedBy: "Dr. Emily Rodriguez",
      startDate: "2025-08-03",
      refills: 2,
      status: "active",
    },
    {
      id: 3,
      medication: "Hydrocortisone Cream 1%",
      dosage: "Apply twice daily",
      prescribedBy: "Dr. James Wilson",
      startDate: "2025-06-20",
      refills: 1,
      status: "completed",
    },
  ]

  testResults: TestResult[] = [
    {
      id: 1,
      test: "Complete Blood Count",
      date: "2025-09-15",
      status: "Normal",
      orderedBy: "Dr. Michael Chen",
    },
    {
      id: 2,
      test: "Lipid Panel",
      date: "2025-09-15",
      status: "Slightly Elevated",
      orderedBy: "Dr. Michael Chen",
    },
    {
      id: 3,
      test: "Allergy Test Panel",
      date: "2025-08-03",
      status: "Positive for Pollen",
      orderedBy: "Dr. Emily Rodriguez",
    },
  ]

  notifications = [
    {
      id: 1,
      title: "Appointment Reminder",
      message: "You have an appointment with Dr. Smith tomorrow at 2:00 PM",
      time: "2 hours ago",
      read: false,
    },
    {
      id: 2,
      title: "Test Results Available",
      message: "Your blood test results are now available",
      time: "1 day ago",
      read: false,
    },
    {
      id: 3,
      title: "Prescription Ready",
      message: "Your prescription is ready for pickup",
      time: "2 days ago",
      read: true,
    },
  ]

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser()
    this.loadAppointments()
    this.loadDashboardStats()
    this.setupTheme()
    this.updateNotificationCount()
  }

  loadCurrentUser(): void {
    this.currentUser = this.authService.currentUser()
  }

  loadAppointments(): void {
    this.isLoading.set(true)
    this.appointmentService.getMyAppointments().subscribe({
      next: (data) => {
        this.appointments = data
        this.filteredAppointments = data.filter((apt) => apt.status === "confirmed" || apt.status === "pending")
        this.isLoading.set(false)
      },
      error: (error: any) => {
        console.error("Error loading appointments:", error)
        this.isLoading.set(false)
      },
    })
  }

  loadDashboardStats(): void {
    this.appointmentService.getMyAppointments().subscribe({
      next: (appointments) => {
        const stats: DashboardStats = {
          upcomingAppointments: appointments.filter(
            (a) => (a.status === "confirmed" || a.status === "pending") && new Date(a.appointmentDate) >= new Date(),
          ).length,
          totalAppointments: appointments.length,
          completedAppointments: appointments.filter((a) => a.status === "completed").length,
          cancelledAppointments: appointments.filter((a) => a.status === "cancelled").length,
          medicalRecords: this.currentUser?.medicalRecordsCount || 0,
          prescriptions: this.prescriptions.length,
          testResults: this.currentUser?.testResultsCount || 0,
        }
        this.dashboardStats.set(stats)
      },
    })
  }

  setupTheme(): void {
    this.isDarkMode.set(localStorage.getItem("dark-mode") === "true")
    if (this.isDarkMode()) {
      document.body.classList.add("dark")
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed)
    localStorage.setItem("sidebar-collapsed", this.sidebarCollapsed().toString())
  }

  toggleTheme(): void {
    this.isDarkMode.update((dark) => !dark)
    localStorage.setItem("dark-mode", this.isDarkMode().toString())
    document.body.classList.toggle("dark")
  }

  toggleNotifications(): void {
    this.showNotifications.update((show) => !show)
  }

  updateNotificationCount(): void {
    const unreadCount = this.notifications.filter((n) => !n.read).length
    this.notificationCount.set(unreadCount)
  }

  markNotificationAsRead(notificationId: number): void {
    const notification = this.notifications.find((n) => n.id === notificationId)
    if (notification && !notification.read) {
      notification.read = true
      this.updateNotificationCount()
    }
  }

  bookAppointment(): void {
    this.router.navigate(["/patient/appointments/new"])
  }

  downloadRecords(): void {
    console.log("Downloading medical records...")
  }

  callEmergency(): void {
    window.open("tel:911", "_self")
  }

  openSettings(): void {
    this.router.navigate(["/patient/settings"])
  }

  logout(): void {
    this.authService.logout()
  }

  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName || !lastName) return "P"
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
  }

  getUpcomingAppointments(): Appointment[] {
    const today = new Date()
    return this.appointments
      .filter(
        (appointment) =>
          new Date(appointment.appointmentDate) >= today &&
          (appointment.status === "confirmed" || appointment.status === "pending"),
      )
      .slice(0, 3)
  }

  getRecentAppointments(): Appointment[] {
    return this.appointments
      .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
      .slice(0, 5)
  }

  getAppointmentStatusClass(status: string): string {
    switch (status) {
      case "confirmed":
        return "status-confirmed"
      case "pending":
        return "status-pending"
      case "completed":
        return "status-completed"
      case "cancelled":
        return "status-cancelled"
      default:
        return "status-default"
    }
  }

  getAppointmentStatusIcon(status: string): string {
    switch (status) {
      case "confirmed":
        return "bi-check-circle"
      case "pending":
        return "bi-clock"
      case "completed":
        return "bi-check2-all"
      case "cancelled":
        return "bi-x-circle"
      default:
        return "bi-question-circle"
    }
  }

  onSearchChange(): void {
    const query = this.searchQuery().toLowerCase()
    if (query) {
      this.filteredAppointments = this.appointments.filter(
        (appointment) =>
          appointment.doctor?.firstName?.toLowerCase().includes(query) ||
          appointment.doctor?.lastName?.toLowerCase().includes(query) ||
          appointment.doctor?.specialty?.toLowerCase().includes(query) ||
          appointment.notes?.toLowerCase().includes(query),
      )
    } else {
      this.filteredAppointments = this.appointments.filter(
        (apt) => apt.status === "confirmed" || apt.status === "pending",
      )
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case "normal":
        return "badge-success"
      case "slightly elevated":
        return "badge-warning"
      case "positive for pollen":
        return "badge-info"
      default:
        return "badge-default"
    }
  }

  requestRefill(prescription: Prescription): void {
    console.log("Requesting refill for:", prescription.medication)
  }

  viewDetails(testResult: TestResult): void {
    console.log("Viewing details for:", testResult.test)
  }

  getActivePrescriptionsCount(): number {
    return this.prescriptions.filter((p) => p.status === "active").length
  }

  setActiveTab(tab: string): void {
    this.activeTab.set(tab)
  }
}
