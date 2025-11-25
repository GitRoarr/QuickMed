import { Component,  OnInit } from "@angular/core"
import  { Router } from "@angular/router"
import { CommonModule } from "@angular/common"
import { FormsModule, ReactiveFormsModule } from "@angular/forms"
import { SidebarComponent } from "../shared/sidebar"
import { HeaderComponent } from "../shared/header"

import  { AdminService, User } from "@app/core/services/admin.service"

@Component({
  selector: "app-admin-doctors",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, HeaderComponent],

  templateUrl: "./admin-doctors.component.html",
  styleUrls: ["./admin-doctors.component.scss"],
})
export class AdminDoctorsComponent implements OnInit {
  doctors: User[] = []
  loading = false
  menuItems = [
    { label: "Overview", icon: "grid", route: "/admin/overview" },
    { label: "Appointments", icon: "calendar", route: "/admin/appointments" },
    { label: "Patients", icon: "people", route: "/admin/patients" },
    { label: "Doctors", icon: "stethoscope", route: "/admin/doctors" },
    { label: "User Management", icon: "person-gear", route: "/admin/users" },
    { label: "Analytics", icon: "bar-chart", route: "/admin/analytics" },
    { label: "Settings", icon: "gear", route: "/admin/settings" },
  ]

  constructor(
    private adminService: AdminService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDoctors()
  }

  loadDoctors() {
    this.loading = true
    this.adminService.getAllUsers(1, 100, "doctor").subscribe({
      next: (res: any) => {
        // Backend returns { users, total, page, limit, totalPages }
        this.doctors = res.users || res.data || []
        this.loading = false
      },
      error: (err: any) => {
        console.error("Failed to load doctors:", err)
        this.loading = false
      },
    })
  }

  onAdd() {
    this.router.navigate(["/admin/doctors/add-doctor"])
  }

  onVerify(id: string) {
    this.router.navigate(["/admin/doctors", id, "verify"])
  }

  onDelete(id: string) {
    if (confirm("Are you sure you want to delete this doctor?")) {
      this.adminService.deleteUser(id).subscribe(() => this.loadDoctors())
    }
  }
}
