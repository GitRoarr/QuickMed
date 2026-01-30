import { Component, DestroyRef, type OnInit, computed, inject, signal } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Subject, debounceTime, distinctUntilChanged } from "rxjs"
import { takeUntilDestroyed } from "@angular/core/rxjs-interop"

import { AdminShellComponent } from "../shared/admin-shell"
import { AppointmentCreateModalComponent } from '../appointments/appointment-create-modal/appointment-create-modal.component';
import { PatientCreateModalComponent } from './patient-create-modal/patient-create-modal.component';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';
import { PatientDetailModalComponent } from './patient-detail-modal/patient-detail-modal.component';
import { MessagePatientModalComponent } from './message-patient-modal/message-patient-modal.component';
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
  imports: [CommonModule, AdminShellComponent, FormsModule, AlertMessageComponent, PatientDetailModalComponent, MessagePatientModalComponent, AppointmentCreateModalComponent, PatientCreateModalComponent],
  templateUrl: "./patients.component.html",
  styleUrls: ["./patients.component.css"],
})
export class PatientsComponent implements OnInit {
  private readonly adminService = inject(AdminService)
  private readonly destroyRef = inject(DestroyRef)

  patients = signal<PatientRow[]>([])
  isLoading = signal<boolean>(false)
  errorMessage = signal<string>("")

  // Removed old form state signals

  page = signal<number>(1)
  totalPages = signal<number>(1)
  readonly pageSize = 6

  private readonly search$ = new Subject<string>()
  private searchTerm = ""
  statusFilter: "all" | "active" | "pending" = "all"

  // Modals
  showCreateModal = signal<boolean>(false)
  highlightedPatient = signal<PatientRow | null>(null)
  showDetailModal = signal<boolean>(false)
  showMessageModal = signal<boolean>(false)
  showAppointmentModal = signal<boolean>(false)

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
    this.showDetailModal.set(true)
  }

  closeDetailModal() {
    this.showDetailModal.set(false)
    this.highlightedPatient.set(null)
  }

  openMessageModal() {
    this.showDetailModal.set(false) // Close details if open
    this.showMessageModal.set(true)
  }

  closeMessageModal() {
    this.showMessageModal.set(false)
  }

  handleSendMessage(data: { subject: string; message: string }) {
    console.log('Sending message to:', this.highlightedPatient()?.fullName, data);
    // Mimic API call
    setTimeout(() => {
      this.closeMessageModal();
      alert(`Message sent to ${this.highlightedPatient()?.fullName}`);
    }, 1000);
  }

  handleSchedule() {
    this.showDetailModal.set(false);
    this.showAppointmentModal.set(true);
  }

  closeAppointmentModal() {
    this.showAppointmentModal.set(false);
  }

  onAppointmentCreated() {
    this.closeAppointmentModal();
    // Maybe verify or refresh patient data to update 'next appointment'
    this.loadPatients();
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  onPatientCreated(): void {
    this.loadPatients();
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
    const patientId = user.id || user.patientId || "—"
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

}
