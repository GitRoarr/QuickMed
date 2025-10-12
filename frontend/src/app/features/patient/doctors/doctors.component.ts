import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { SidebarComponent } from "@app/shared/components/sidebar/sidebar.component"
import { DoctorService } from "@core/services/doctor.service"
import { AppointmentService } from "@core/services/appointment.service"
import { User } from "@core/models/user.model"

@Component({
  selector: "app-patient-doctors",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: "./doctors.component.html",
  styleUrls: ["./doctors.component.css"],
})
export class DoctorsComponent implements OnInit {
  doctors: User[] = []
  isLoading = true
  selectedDoctor: User | null = null
  appointmentForm: FormGroup
  showBookingForm = false

  menuItems = [
    { label: "Dashboard", icon: "bi-house", route: "/patient/dashboard" },
    { label: "My Appointments", icon: "bi-calendar-check", route: "/patient/appointments" },
    { label: "Find Doctors", icon: "bi-people", route: "/patient/doctors" },
  ]

  constructor(
    private doctorService: DoctorService,
    private appointmentService: AppointmentService,
    private fb: FormBuilder,
  ) {
    this.appointmentForm = this.fb.group({
      appointmentDate: ["", Validators.required],
      appointmentTime: ["", Validators.required],
      notes: [""],
    })
  }

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

  selectDoctor(doctor: User): void {
    this.selectedDoctor = doctor
    this.showBookingForm = true
  }

  closeBookingForm(): void {
    this.showBookingForm = false
    this.selectedDoctor = null
    this.appointmentForm.reset()
  }

  bookAppointment(): void {
    if (this.appointmentForm.invalid || !this.selectedDoctor) {
      return
    }

    const appointmentData = {
      ...this.appointmentForm.value,
      doctorId: this.selectedDoctor.id,
    }

    this.appointmentService.create(appointmentData).subscribe({
      next: () => {
        alert("Appointment booked successfully!")
        this.closeBookingForm()
      },
      error: (error) => {
        alert(error.error?.message || "Failed to book appointment")
      },
    })
  }
}
