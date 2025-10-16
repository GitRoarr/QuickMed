import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { AdminLayoutComponent } from "../shared/admin-layout/admin-layout.component"
import type { UserService } from "@core/services/user.service"

interface Patient {
  id: string
  initials: string
  name: string
  age: number
  gender: string
  condition: string
  lastVisit: string
  status: string
  email: string
  phone: string
}

@Component({
  selector: "app-admin-patients",
  standalone: true,
  imports: [CommonModule, AdminLayoutComponent],
  templateUrl: "./patients.component.html",
  styleUrls: ["./patients.component.css"],
})
export class PatientsComponent implements OnInit {
  patients: Patient[] = []
  isLoading = false

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadPatients()
  }

  loadPatients(): void {
    this.isLoading = true
    // Load patients from service
    this.patients = [
      {
        id: "1",
        initials: "SJ",
        name: "Sarah Johnson",
        age: 34,
        gender: "Female",
        condition: "Hypertension",
        lastVisit: "2024-01-10",
        status: "active",
        email: "sarah.j@email.com",
        phone: "+1 (555) 123-4567",
      },
      {
        id: "2",
        initials: "JW",
        name: "James Wilson",
        age: 45,
        gender: "Male",
        condition: "Diabetes Type 2",
        lastVisit: "2024-01-08",
        status: "active",
        email: "james.w@email.com",
        phone: "+1 (555) 234-5678",
      },
      {
        id: "3",
        initials: "MG",
        name: "Maria Garcia",
        age: 28,
        gender: "Female",
        condition: "Asthma",
        lastVisit: "2024-01-05",
        status: "active",
        email: "maria.g@email.com",
        phone: "+1 (555) 345-6789",
      },
      {
        id: "4",
        initials: "RB",
        name: "Robert Brown",
        age: 52,
        gender: "Male",
        condition: "Arthritis",
        lastVisit: "2023-12-28",
        status: "inactive",
        email: "robert.b@email.com",
        phone: "+1 (555) 456-7890",
      },
    ]
    this.isLoading = false
  }

  getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
  }

  getAvatarColor(initials: string): string {
    const colors = ["#dcfce7", "#dbeafe", "#fce7f3", "#fef3c7"]
    const index = initials.charCodeAt(0) % colors.length
    return colors[index]
  }
}
