import { Component, DestroyRef, type OnInit, computed, inject, signal } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Subject, debounceTime, distinctUntilChanged } from "rxjs"
import { takeUntilDestroyed } from "@angular/core/rxjs-interop"

import { SidebarComponent } from "../shared/sidebar"
import { HeaderComponent } from "../shared/header"
import { AdminService, type User } from "@app/core/services/admin.service"

interface PatientRow {
  id: string
  initials: string
  fullName: string
  ageLabel: string
  genderLabel: string
  condition: string
  lastVisit: string
  patientId: string
  nextAppointment: string
  status: "active" | "pending"
  email: string
  phone?: string
  raw: User
}

@Component({
  selector: "app-patients",
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent, FormsModule],
  templateUrl: "./patients.component.html",
  styleUrls: ["./patients.component.css"],
})
export class PatientsComponent implements OnInit {
  private readonly adminService = inject(AdminService)
  private readonly destroyRef = inject(DestroyRef)

  patients = signal<PatientRow[]>([])
  isLoading = signal<boolean>(false)
  errorMessage = signal<string>("")
  isSavingPatient = signal<boolean>(false)
  patientFormMessage = signal<{ type: "success" | "error"; text: string } | null>(null)

  page = signal<number>(1)
  totalPages = signal<number>(1)
  readonly pageSize = 6

  private readonly search$ = new Subject<string>()
  private searchTerm = ""
  statusFilter: "all" | "active" | "pending" = "all"
  showAddPatientForm = signal<boolean>(false)

  highlightedPatient = signal<PatientRow | null>(null)
  totalPatients = signal<number>(0)
  activePatients = signal<number>(0)
  pendingPatients = signal<number>(0)

  menuItems = [
    { label: "Overview", icon: "grid", route: "/admin/overview" },
    { label: "Appointments", icon: "calendar", route: "/admin/appointments" },
    { label: "Patients", icon: "people", route: "/admin/patients" },
    { label: "Doctors", icon: "stethoscope", route: "/admin/doctors" },
    { label: "User Management", icon: "person-gear", route: "/admin/users" },
    { label: "Analytics", icon: "bar-chart", route: "/admin/analytics" },
    { label: "Settings", icon: "gear", route: "/admin/settings" },
  ]

  summaryCards = computed(() => [
    {
      label: "Total Patients",
      value: this.totalPatients(),
      tone: "text-slate-700 bg-slate-100",
    },
    {
      label: "Active Patients",
      value: this.activePatients(),
      tone: "text-green-700 bg-green-100",
    },
    {
      label: "Pending Review",
      value: this.pendingPatients(),
      tone: "text-amber-700 bg-amber-100",
    },
  ])

  visiblePatients = computed(() => {
    return this.patients().filter((patient) => {
      if (this.statusFilter === "all") return true
      return patient.status === this.statusFilter
    })
  })

  newPatient = {
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    bloodType: "",
    medicalHistory: "",
  }

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchTerm = term
        this.page.set(1)
        this.loadPatients()
      })

    this.loadPatients()
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement | null
    this.search$.next((target?.value || "").trim())
  }

  changeFilter(filter: "all" | "active" | "pending"): void {
    this.statusFilter = filter
  }

  goToPage(direction: "next" | "prev"): void {
    const newPage = direction === "next" ? this.page() + 1 : this.page() - 1
    if (newPage < 1 || newPage > this.totalPages()) return
    this.page.set(newPage)
    this.loadPatients()
  }

  refresh(): void {
    this.loadPatients()
  }

  selectPatient(patient: PatientRow): void {
    this.highlightedPatient.set(patient)
  }

  toggleAddPatientForm(): void {
    this.showAddPatientForm.update((value) => !value)
    this.patientFormMessage.set(null)
  }

  createPatient(): void {
    const payload = this.newPatient
    if (!payload.firstName || !payload.lastName || !payload.email) {
      this.patientFormMessage.set({ type: "error", text: "First name, last name, and email are required." })
      return
    }

    this.isSavingPatient.set(true)
    this.patientFormMessage.set(null)

    const requestBody: Partial<User> & { password: string } = {
      ...payload,
      role: "patient",
      password: this.generateTempPassword(),
      patientId: this.generatePatientId(),
      dateOfBirth: payload.dateOfBirth || undefined,
      medicalHistory: payload.medicalHistory || undefined,
      bloodType: payload.bloodType || undefined,
      allergies: [],
    }

    this.adminService
      .createPatient(requestBody)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.patientFormMessage.set({
            type: "success",
            text: `${payload.firstName} ${payload.lastName} has been added.`,
          })
          this.isSavingPatient.set(false)
          this.resetPatientForm()
          this.loadPatients()
        },
        error: (err) => {
          console.error("Failed to create patient", err)
          this.patientFormMessage.set({ type: "error", text: err.error?.message || "Failed to add patient." })
          this.isSavingPatient.set(false)
        },
      })
  }

  private loadPatients(): void {
    this.isLoading.set(true)
    this.errorMessage.set("")

    this.adminService
      .getPatients(this.page(), this.pageSize, this.searchTerm)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.patients.set(response.data.map((user) => this.mapPatient(user)))
          this.totalPages.set(Math.max(1, response.totalPages))
          this.totalPatients.set(response.total)

          const activeOnPage = this.patients().filter((p) => p.status === "active").length
          const pendingOnPage = this.patients().filter((p) => p.status === "pending").length
          this.activePatients.set(activeOnPage)
          this.pendingPatients.set(pendingOnPage)

          if (!this.highlightedPatient() && response.data.length) {
            this.highlightedPatient.set(this.mapPatient(response.data[0]))
          }
          this.isLoading.set(false)
        },
        error: (err) => {
          console.error("Failed to load patients", err)
          this.errorMessage.set(err.error?.message || "Unable to load patients.")
          this.isLoading.set(false)
        },
      })
  }

  private mapPatient(user: User): PatientRow {
    const initials = `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase() || "??"
    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
    const ageLabel = user.dateOfBirth ? `${this.calculateAgeFromDate(user.dateOfBirth)} yrs` : "—"
    const genderLabel = this.deriveGender(user)
    const patientId = user.patientId || "—"
    const status: "active" | "pending" = user.isActive ? "active" : "pending"

    return {
      id: user.id,
      initials,
      fullName,
      ageLabel,
      genderLabel,
      condition: user.medicalHistory?.split(";")[0] || "General care",
      lastVisit: this.formatDate(user.updatedAt || user.createdAt),
      patientId,
      nextAppointment: "TBD",
      status,
      email: user.email,
      phone: user.phoneNumber,
      raw: user,
    }
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date))
  }

  private calculateAgeFromDate(dateString: string): number {
    const dob = new Date(dateString)
    const diff = Date.now() - dob.getTime()
    const ageDate = new Date(diff)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  }

  private deriveGender(user: User): string {
    const history = user.medicalHistory?.toLowerCase() || ""
    if (history.includes("female")) return "Female"
    if (history.includes("male")) return "Male"
    return "—"
  }

  resetPatientForm(): void {
    this.newPatient = {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      dateOfBirth: "",
      bloodType: "",
      medicalHistory: "",
    }
  }

  private generateTempPassword(): string {
    return `Patient@${Math.floor(1000 + Math.random() * 9000)}`
  }

  private generatePatientId(): string {
    const random = Math.floor(1000 + Math.random() * 9000)
    return `PAT-${random}`
  }
}
