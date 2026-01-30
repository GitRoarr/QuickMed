import { Component, OnInit, DestroyRef, inject, signal } from "@angular/core"
import { CommonModule, DatePipe } from "@angular/common"
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop"
import { AdminShellComponent } from "../shared/admin-shell"
import { ThemeService } from "@core/services/theme.service"
import {
  AdminService,
  AdminStats,
  Appointment,
  SystemHealthStatus,
  User,
} from "@app/core/services/admin.service"

interface StatCard {
  label: string
  value: string
  change: string
  icon?: string
  iconLight?: string
  iconDark?: string
  trend?: "up" | "down" | "neutral"
}

interface DoctorSchedule {
  initials: string
  name: string
  specialty: string
  schedule: string
  status: string
  patientCount: number
}

interface AppointmentCard {
  id: string
  patientName: string
  appointmentType: string
  mode: "In-Person" | "Video"
  doctorName: string
  time: string
  status: string
}

@Component({
  selector: "app-admin-overview",
  standalone: true,
  imports: [CommonModule, AdminShellComponent, DatePipe, AlertMessageComponent],
  templateUrl: "./overview.component.html",
  styleUrls: ["./overview.component.css"],
})
export class OverviewComponent implements OnInit {
  private readonly adminService = inject(AdminService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly themeService = inject(ThemeService)

  stats = signal<StatCard[]>([])
  doctorSchedules = signal<DoctorSchedule[]>([])
  todayAppointments = signal<AppointmentCard[]>([])
  appointmentSummary = signal<{ label: string; value: number }[]>([])
  recentPatients = signal<User[]>([])
  systemHealth = signal<{ label: string; status: string; tone: string }[]>([])

  isLoading = signal<boolean>(true)
  errorMessage = signal<string>("")

  ngOnInit(): void {
    this.fetchDashboard()
  }

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode()
  }

  retry(): void {
    this.fetchDashboard()
  }

  private fetchDashboard(): void {
    this.isLoading.set(true)
    this.errorMessage.set("")

    this.adminService
      .getDashboardData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.stats.set(this.buildStatCards(response.stats))
          this.appointmentSummary.set(this.buildAppointmentSummary(response.stats))
          this.doctorSchedules.set(this.buildDoctorSchedules(response.upcomingAppointments))
          this.todayAppointments.set(this.buildTodayAppointments(response.upcomingAppointments))
          this.recentPatients.set(response.recentUsers.filter((u) => u.role === "patient"))
          this.systemHealth.set(this.buildSystemHealth(response.systemHealth))
          this.isLoading.set(false)
        },
        error: (err) => {
          console.error("Failed to load admin dashboard", err)
          this.errorMessage.set(err.error?.message || "Unable to load dashboard data. Please try again.")
          this.isLoading.set(false)
        },
      })
  }

  private buildStatCards(stats: AdminStats): StatCard[] {
    const totalAppointmentsIconLight = "https://img.icons8.com/?size=100&id=87821&format=png&color=000000"
    const totalAppointmentsIconDark = "https://img.icons8.com/?size=100&id=58848&format=png&color=FFFFFF"
    const totalPatientsIconLight = "https://img.icons8.com/?size=100&id=10849&format=png&color=000000"
    const totalPatientsIconDark = "https://img.icons8.com/?size=100&id=10849&format=png&color=FFFFFF"
    const pendingIconLight = "https://img.icons8.com/?size=100&id=33945&format=png&color=000000"
    const pendingIconDark = "https://img.icons8.com/?size=100&id=33945&format=png&color=FFFFFF"
    const avgWaitIconLight = "https://img.icons8.com/?size=100&id=58173&format=png&color=000000"
    const avgWaitIconDark = "https://img.icons8.com/?size=100&id=58173&format=png&color=FFFFFF"
    const completedIconLight = "https://img.icons8.com/?size=100&id=39050&format=png&color=000000"
    const completedIconDark = "https://img.icons8.com/?size=100&id=39050&format=png&color=000000"

    return [
      {
        label: "Total Appointments",
        value: stats.totalAppointments.toLocaleString(),
        change: `${stats.todayAppointments} today • ${stats.thisWeekAppointments} this week`,
        iconLight: totalAppointmentsIconLight,
        iconDark: totalAppointmentsIconDark,
        trend: "up",
      },
      {
        label: "Total Patients",
        value: stats.totalPatients.toLocaleString(),
        change: `${stats.totalUsers.toLocaleString()} users total`,
        iconLight: totalPatientsIconLight,
        iconDark: totalPatientsIconDark,
        trend: "up",
      },
      {
        label: "Revenue",
        value: `$${stats.revenue.toLocaleString()}`,
        change: "Est. $150 per consult",
        icon: "💵",
        trend: "up",
      },
      {
        label: "Pending Appointments",
        value: stats.pendingAppointments.toString(),
        change: `${stats.confirmedAppointments} confirmed`,
        iconLight: pendingIconLight,
        iconDark: pendingIconDark,
        trend: stats.pendingAppointments > 20 ? "up" : "down",
      },
      {
        label: "Completed",
        value: stats.completedAppointments.toString(),
        change: `${stats.cancelledAppointments} cancelled`,
        iconLight: completedIconLight,
        iconDark: completedIconDark,
        trend: "up",
      },
      {
        label: "Avg. Wait Time",
        value: `${stats.averageAppointmentDuration} min`,
        change: `Satisfaction ${stats.patientSatisfactionScore}/5`,
        iconLight: avgWaitIconLight,
        iconDark: avgWaitIconDark,
        trend: "neutral",
      },
    ]
  }

  private buildDoctorSchedules(upcoming: Appointment[]): DoctorSchedule[] {
    const schedules = new Map<string, DoctorSchedule>()

    upcoming.forEach((appt) => {
      if (!appt.doctor) return
      const id = appt.doctor.id
      const existing = schedules.get(id) ?? {
        initials: this.buildInitials(appt.doctor),
        name: `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}`,
        specialty: appt.doctor.specialty || "General Practice",
        schedule: "",
        status: appt.status,
        patientCount: 0,
      }

      existing.patientCount += 1
      existing.schedule = this.formatSchedule(appt.appointmentDate, appt.appointmentTime)
      existing.status = appt.status

      schedules.set(id, existing)
    })

    return Array.from(schedules.values()).sort((a, b) => b.patientCount - a.patientCount).slice(0, 4)
  }

  private buildTodayAppointments(upcoming: Appointment[]): AppointmentCard[] {
    return upcoming
      .filter((appt) => this.isToday(appt.appointmentDate))
      .slice(0, 5)
      .map((appt) => ({
        id: appt.id,
        patientName: appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : "Unassigned",
        appointmentType: appt.notes || "Consultation",
        mode: appt.isVideoConsultation ? "Video" : "In-Person",
        doctorName: appt.doctor ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` : "TBD",
        time: this.formatTime(appt.appointmentDate, appt.appointmentTime),
        status: appt.status,
      }))
  }

  private buildAppointmentSummary(stats: AdminStats) {
    return [
      { label: "Today", value: stats.todayAppointments },
      { label: "This Week", value: stats.thisWeekAppointments },
      { label: "This Month", value: stats.thisMonthAppointments },
      { label: "Pending", value: stats.pendingAppointments },
    ]
  }

  private buildSystemHealth(health: SystemHealthStatus) {
    const toneMap: Record<string, string> = {
      healthy: "text-green-700 bg-green-100",
      warning: "text-amber-700 bg-amber-100",
      error: "text-red-700 bg-red-100",
    }

    return Object.entries(health || {}).map(([key, status]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      status,
      tone: toneMap[status] || "text-gray-700 bg-gray-100",
    }))
  }

  private buildInitials(user: User): string {
    const first = user.firstName?.charAt(0) || ""
    const last = user.lastName?.charAt(0) || ""
    return `${first}${last}`.toUpperCase() || "??"
  }

  private formatTime(date: string, time: string): string {
    const dateTime = this.composeDate(date, time)
    if (!dateTime) return time || "—"
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(dateTime)
  }

  private formatSchedule(date: string, time: string): string {
    const dateTime = this.composeDate(date, time)
    if (!dateTime) return "Schedule TBD"
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(dateTime)
  }

  private composeDate(date?: string, time?: string): Date | null {
    if (!date) return null
    const safeTime = time || "09:00"
    const iso = `${date.toString().split("T")[0]}T${safeTime}`
    const parsed = new Date(iso)
    return isNaN(parsed.getTime()) ? null : parsed
  }

  private isToday(date?: string): boolean {
    if (!date) return false
    const today = new Date().toISOString().split("T")[0]
    return date.toString().split("T")[0] === today
  }
}
