import { Component, OnInit, signal } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { SidebarComponent } from "../shared/sidebar"
import { HeaderComponent } from "../shared/header"
import { AdminService, User } from "@app/core/services/admin.service"

@Component({
  selector: "app-admin-receptionists",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, HeaderComponent],
  templateUrl: "./admin-receptionists.component.html",
  styleUrls: ["./admin-receptionists.component.scss"],
})
export class AdminReceptionistsComponent implements OnInit {
  receptionists = signal<User[]>([])
  loading = signal(false)
  filterForm!: FormGroup
  inviteForm!: FormGroup
  message = signal<{ type: "success" | "error"; text: string } | null>(null)

  menuItems = [
    { label: "Overview", icon: "grid", route: "/admin/overview" },
    { label: "Appointments", icon: "calendar", route: "/admin/appointments" },
    { label: "Patients", icon: "people", route: "/admin/patients" },
    { label: "Doctors", icon: "stethoscope", route: "/admin/doctors" },
    { label: "Receptionists", icon: "headset", route: "/admin/receptionists" },
    { label: "User Management", icon: "person-gear", route: "/admin/users" },
    { label: "Analytics", icon: "bar-chart", route: "/admin/analytics" },
    { label: "Settings", icon: "gear", route: "/admin/settings" },
  ]

  constructor(private adminService: AdminService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      search: [""],
      status: ["all"],
    })

    this.inviteForm = this.fb.group({
      firstName: ["", [Validators.required]],
      lastName: ["", [Validators.required]],
      email: ["", [Validators.required, Validators.email]],
      phoneNumber: [""]
    })

    this.filterForm.valueChanges.subscribe(() => this.loadReceptionists())
    this.loadReceptionists()
  }

  loadReceptionists() {
    const { search, status } = this.filterForm.value
    this.loading.set(true)
    this.adminService
      .getAllUsers(1, 100, "receptionist", search)
      .subscribe({
        next: (res) => {
          let list = res.data || []
          if (status === "active") list = list.filter((u) => u.isActive)
          if (status === "inactive") list = list.filter((u) => !u.isActive)
          this.receptionists.set(list)
          this.loading.set(false)
        },
        error: (err) => {
          console.error("Failed to load receptionists", err)
          this.message.set({ type: "error", text: err.error?.message || "Failed to load receptionists" })
          this.loading.set(false)
        },
      })
  }

  inviteReceptionist() {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched()
      return
    }

    this.loading.set(true)
    const payload = {
      firstName: this.inviteForm.value.firstName,
      lastName: this.inviteForm.value.lastName,
      email: this.inviteForm.value.email,
      phoneNumber: this.inviteForm.value.phoneNumber || undefined,
    }

    this.adminService.inviteReceptionist(payload).subscribe({
      next: (res) => {
        this.message.set({ 
          type: "success", 
          text: res.emailSent 
            ? `Invitation sent to ${payload.email}. They will receive an email to set their password.`
            : `Invitation created. Share this link: ${res.inviteLink || 'N/A'}`
        })
        this.inviteForm.reset()
        this.loadReceptionists()
        this.loading.set(false)
      },
      error: (err) => {
        this.message.set({ type: "error", text: err.error?.message || "Unable to send invitation" })
        this.loading.set(false)
      },
    })
  }

  toggleActive(user: User) {
    this.adminService.updateUser(user.id, { isActive: !user.isActive }).subscribe({
      next: () => this.loadReceptionists(),
      error: (err) => (this.message.set({ type: "error", text: err.error?.message || "Failed to update status" })),
    })
  }

  removeReceptionist(id: string) {
    if (!confirm("Remove this receptionist?")) return
    this.adminService.deleteUser(id).subscribe({
      next: () => this.loadReceptionists(),
      error: (err) => (this.message.set({ type: "error", text: err.error?.message || "Failed to delete" })),
    })
  }

  getInitials(user: User) {
    return `${(user.firstName[0] || "")}${(user.lastName[0] || "")}`.toUpperCase()
  }
}
