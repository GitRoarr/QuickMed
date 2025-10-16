import { Component,  OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { AdminLayoutComponent } from "../shared/admin-layout/admin-layout.component"
import  { AppointmentService } from "@core/services/appointment.service"
import  { UserService } from "@core/services/user.service"

interface StatCard {
  label: string
  value: number | string
  change: string
  icon: string
  iconBg: string
}

interface DoctorSchedule {
  initials: string
  name: string
  specialty: string
  schedule: string
  status: string
  patientCount: number
  bgColor: string
}

@Component({
  selector: "app-admin-overview",
  standalone: true,
  imports: [CommonModule, AdminLayoutComponent],
  templateUrl: "./overview.component.html",
  styleUrls: ["./overview.component.css"],
})
export class OverviewComponent implements OnInit {
  stats: StatCard[] = [
    { label: "Total Appointments", value: "1,284", change: "+12.5% from last month", icon: "📅", iconBg: "#dcfce7" },
    { label: "Total Patients", value: "892", change: "+8.2% from last month", icon: "👥", iconBg: "#dbeafe" },
    { label: "Revenue", value: "$48,392", change: "+23.1% from last month", icon: "💵", iconBg: "#dcfce7" },
    { label: "Pending", value: "24", change: "-4.3% from last month", icon: "⏱️", iconBg: "#fed7aa" },
    { label: "Completed Today", value: "18", change: "+6.1% from last month", icon: "✅", iconBg: "#dcfce7" },
    { label: "Avg. Wait Time", value: "12 min", change: "-2.4% from last month", icon: "📊", iconBg: "#e0e7ff" },
  ]

  doctorSchedules: DoctorSchedule[] = [
    {
      initials: "MI",
      name: "Dr. Michael Chen",
      specialty: "Cardiology",
      schedule: "08:00 AM - 04:00 PM",
      status: "Active",
      patientCount: 12,
      bgColor: "#d1fae5",
    },
    {
      initials: "EM",
      name: "Dr. Emily Rodriguez",
      specialty: "Pediatrics",
      schedule: "09:00 AM - 05:00 PM",
      status: "Active",
      patientCount: 15,
      bgColor: "#dbeafe",
    },
    {
      initials: "SA",
      name: "Dr. Sarah Thompson",
      specialty: "Orthopedics",
      schedule: "10:00 AM - 06:00 PM",
      status: "Active",
      patientCount: 8,
      bgColor: "#fce7f3",
    },
  ]

  chartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    values: [180, 220, 240, 260, 280, 320],
  }

  constructor(
    private appointmentService: AppointmentService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.loadDashboardData()
  }

  loadDashboardData(): void {
    // Load real data from services
  }
}
