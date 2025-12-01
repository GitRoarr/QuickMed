import { Component, OnInit, signal } from "@angular/core"
import { Router } from "@angular/router"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, ReactiveFormsModule } from "@angular/forms"
import { SidebarComponent } from "../shared/sidebar"
import { HeaderComponent } from "../shared/header"

import {
  AdminService,
  DoctorOverviewCard,
  DoctorOverviewResponse,
} from "@app/core/services/admin.service"

@Component({
  selector: "app-admin-doctors",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, HeaderComponent],
  templateUrl: "./admin-doctors.component.html",
  styleUrls: ["./admin-doctors.component.scss"],
})
export class AdminDoctorsComponent implements OnInit {
  doctors = signal<DoctorOverviewCard[]>([])
  loading = signal(false)
  stats = signal({
    totalDoctors: 0,
    activeDoctors: 0,
    pendingDoctors: 0,
  })
  specialties = signal<string[]>([])
  filterForm!: FormGroup
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

  constructor(
    private adminService: AdminService,
    private router: Router,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      search: [""],
      status: ["all"],
      specialty: ["all"],
    })

    this.filterForm.valueChanges.subscribe(() => this.loadDoctors())
    this.loadDoctors()
  }

  loadDoctors() {
    const filters = this.filterForm.value
    this.loading.set(true)
    this.adminService
      .getDoctorOverview({
        search: filters.search?.trim(),
        status: filters.status,
        specialty: filters.specialty,
      })
      .subscribe({
        next: (res: DoctorOverviewResponse) => {
          this.doctors.set(res.doctors)
          this.stats.set(res.stats)
          this.specialties.set(res.specialties ?? [])
          this.loading.set(false)
        },
        error: (err) => {
          console.error("Failed to load doctors:", err)
          this.message.set({
            type: "error",
            text: err.error?.message || "Failed to load doctors overview",
          })
          this.loading.set(false)
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
    if (!confirm("Delete this doctor? This action cannot be undone.")) return
    this.loading.set(true)
    this.adminService.deleteDoctor(id).subscribe({
      next: () => {
        this.message.set({ type: "success", text: "Doctor removed successfully." })
        this.loadDoctors()
      },
      error: (err) => {
        console.error("Failed to delete doctor", err)
        this.message.set({
          type: "error",
          text: err.error?.message || "Failed to delete doctor",
        })
        this.loading.set(false)
      },
    })
  }

  validateLicense(id: string) {
    this.adminService.validateDoctorLicense(id).subscribe({
      next: () => {
        this.message.set({ type: "success", text: "License validated." })
        this.loadDoctors()
      },
      error: (err) => {
        this.message.set({
          type: "error",
          text: err.error?.message || "Failed to validate license",
        })
      },
    })
  }

  confirmEmployment(id: string) {
    this.adminService.confirmDoctorEmployment(id).subscribe({
      next: () => {
        this.message.set({ type: "success", text: "Employment confirmed." })
        this.loadDoctors()
      },
      error: (err) => {
        this.message.set({
          type: "error",
          text: err.error?.message || "Failed to confirm employment",
        })
      },
    })
  }

  activateDoctor(id: string) {
    this.adminService.activateDoctor(id).subscribe({
      next: () => {
        this.message.set({ type: "success", text: "Doctor activated." })
        this.loadDoctors()
      },
      error: (err) => {
        this.message.set({
          type: "error",
          text: err.error?.message || "Failed to activate doctor",
        })
      },
    })
  }

  trackByDoctor(_: number, doc: DoctorOverviewCard) {
    return doc.id
  }

  getInitials(doc: DoctorOverviewCard) {
    return `${doc.firstName?.[0] ?? ""}${doc.lastName?.[0] ?? ""}`.toUpperCase()
  }
}
