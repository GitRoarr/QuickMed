import { Component,  OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { SidebarComponent } from "@app/shared/components/sidebar/sidebar.component"
import  { DoctorService } from "@core/services/doctor.service"
import  { User } from "@core/models/user.model"

@Component({
  selector: "app-admin-doctors",
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: "./doctors.component.html",
  styleUrls: ["./doctors.component.css"],
})
export class DoctorsComponent implements OnInit {
  doctors: User[] = []
  isLoading = true

  menuItems = [
    { label: "Dashboard", icon: "bi-house", route: "/admin/dashboard" },
    { label: "Doctors", icon: "bi-people", route: "/admin/doctors" },
    { label: "Appointments", icon: "bi-calendar-check", route: "/admin/appointments" },
  ]

  constructor(private doctorService: DoctorService) {}

  ngOnInit(): void {
    this.loadDoctors()
  }

  loadDoctors(): void {
    this.doctorService.getAll().subscribe({
      next: (data) => {
        this.doctors = data
        this.isLoading = false
      },
      error: () => {
        this.isLoading = false
      },
    })
  }

  deleteDoctor(id: string): void {
    if (confirm("Are you sure you want to delete this doctor?")) {
      this.doctorService.delete(id).subscribe({
        next: () => {
          this.loadDoctors()
        },
      })
    }
  }
}
