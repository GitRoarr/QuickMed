import { Component, OnInit, signal } from "@angular/core"
import { Router } from "@angular/router"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, ReactiveFormsModule } from "@angular/forms"
import { AdminShellComponent } from "../shared/admin-shell"

import {
  AdminService,
  DoctorOverviewCard,
  DoctorOverviewResponse,
} from "@app/core/services/admin.service"
import { ToastService } from "@app/core/services/toast.service"

@Component({
  selector: "app-admin-doctors",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminShellComponent],
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

  constructor(
    private adminService: AdminService,
    private router: Router,
    private fb: FormBuilder,
    private toastService: ToastService
  ) { }

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
          this.toastService.error(err.error?.message || "Failed to load doctors overview")
          this.loading.set(false)
        },
      })
  }

  onAdd() {
    this.router.navigate(["/admin/doctors/add-doctor"])
  }



  validateLicense(id: string) {
    this.adminService.validateDoctorLicense(id).subscribe({
      next: () => {
        this.toastService.success("License validated")
        this.loadDoctors()
      },
      error: (err) => {
        this.toastService.error(err.error?.message || "Failed to validate license")
      },
    })
  }

  confirmEmployment(id: string) {
    this.adminService.confirmDoctorEmployment(id).subscribe({
      next: () => {
        this.toastService.success("Employment confirmed")
        this.loadDoctors()
      },
      error: (err) => {
        this.toastService.error(err.error?.message || "Failed to confirm employment")
      },
    })
  }

  activateDoctor(id: string) {
    this.adminService.activateDoctor(id).subscribe({
      next: () => {
        this.toastService.success("Doctor activated")
        this.loadDoctors()
      },
      error: (err) => {
        this.toastService.error(err.error?.message || "Failed to activate doctor")
      },
    })
  }

  trackByDoctor(_: number, doc: DoctorOverviewCard) {
    return doc.id
  }

  getInitials(doc: DoctorOverviewCard) {
    return `${(doc.firstName[0] || "")}${(doc.lastName[0] || "")}`.toUpperCase()
  }

  onVerify(id: string) {
    this.router.navigate(["/admin/doctors", id])
  }

  onDelete(id: string) {
    if (confirm("Are you sure you want to delete this doctor?")) {
      this.adminService.deleteDoctor(id).subscribe({
        next: () => {
          this.toastService.success("Doctor deleted successfully")
          this.loadDoctors()
        },
        error: (err) => {
          this.toastService.error(
            err.error?.message || "Failed to delete doctor"
          )
        },
      })
    }
  }
}
