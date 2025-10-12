import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { SidebarComponent } from "@app/shared/components/sidebar/sidebar.component"

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent {
  menuItems = [
    { label: "Dashboard", icon: "bi-house", route: "/admin/dashboard" },
    { label: "Doctors", icon: "bi-people", route: "/admin/doctors" },
    { label: "Appointments", icon: "bi-calendar-check", route: "/admin/appointments" },
  ]
}
