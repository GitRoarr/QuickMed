import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterModule,  Router } from "@angular/router"
import { FormsModule } from "@angular/forms"
import  { AuthService } from "@core/services/auth.service"

interface MenuItem {
  label: string
  icon: string
  route: string
}

@Component({
  selector: "app-admin-layout",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./admin-layout.component.html",
  styleUrls: ["./admin-layout.component.css"],
})
export class AdminLayoutComponent {
  searchQuery = ""

  menuItems: MenuItem[] = [
    { label: "Overview", icon: "grid", route: "/admin/dashboard" },
    { label: "Appointments", icon: "calendar", route: "/admin/appointments" },
    { label: "Patients", icon: "users", route: "/admin/patients" },
    { label: "Doctors", icon: "user-check", route: "/admin/doctors" },
    { label: "User Management", icon: "user-cog", route: "/admin/user-management" },
    { label: "Analytics", icon: "bar-chart-2", route: "/admin/analytics" },
    { label: "Settings", icon: "settings", route: "/admin/settings" },
  ]

  currentUser = this.authService.currentUser

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  toggleTheme(): void {
    document.body.classList.toggle("dark")
  }

  createNewAppointment(): void {
    this.router.navigate(["/admin/appointments/new"])
  }

  logout(): void {
    this.authService.logout()
  }
}
