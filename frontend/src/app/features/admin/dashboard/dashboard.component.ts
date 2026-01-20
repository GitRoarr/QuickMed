import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminShellComponent } from '../shared/admin-shell';
import { AdminService } from '@app/core/services/admin.service';
import { AppointmentService } from '@app/core/services/appointment.service';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent, AlertMessageComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
import { ThemeService } from '@core/services/theme.service';
export class DashboardComponent implements OnInit {
  themeService = inject(ThemeService);
    get isDarkMode() {
      return this.themeService.isDarkMode();
    }


  ngOnInit() {
  }

  private adminService = inject(AdminService)
  private appointmentService = inject(AppointmentService)

  showNewAppointment = signal(false)
  patients = signal<Array<any>>([])
  doctors = signal<Array<any>>([])

  apptPatientId = signal('')
  apptDoctorId = signal('')
  apptDate = signal('')
  apptTime = signal('')
  apptIsVideo = signal(false)
  apptNotes = signal('')

  apptAlert = signal<{ type: 'success' | 'error'; text: string } | null>(null)

  openNewAppointment() {
    this.showNewAppointment.set(true)
    this.loadPatientsAndDoctors()
    this.apptAlert.set(null)
  }

  closeNewAppointment() {
    this.showNewAppointment.set(false)
    this.apptPatientId.set('')
    this.apptDoctorId.set('')
    this.apptDate.set('')
    this.apptTime.set('')
    this.apptIsVideo.set(false)
    this.apptNotes.set('')
  }

  loadPatientsAndDoctors() {
    this.adminService.getPatients(1, 200).subscribe({ next: (res) => this.patients.set(res.data) })
    this.adminService.getAllUsers(1, 200, 'doctor').subscribe({ next: (res) => this.doctors.set(res.data) })
  }

  createAppointment() {
    if (!this.apptPatientId() || !this.apptDoctorId() || !this.apptDate() || !this.apptTime()) {
      this.apptAlert.set({ type: 'error', text: 'Please select patient, doctor, date and time.' })
      return
    }

    const payload: any = {
      patientId: this.apptPatientId(),
      doctorId: this.apptDoctorId(),
      appointmentDate: this.apptDate(),
      appointmentTime: this.apptTime(),
      isVideoConsultation: this.apptIsVideo(),
      notes: this.apptNotes(),
    }

    this.appointmentService.create(payload).subscribe({
      next: (res) => {
        this.apptAlert.set({ type: 'success', text: 'Appointment created successfully.' })
        // keep the success alert visible briefly then close
        setTimeout(() => this.closeNewAppointment(), 900)
      },
      error: (err) => {
        console.error('Create appointment failed', err)
        this.apptAlert.set({ type: 'error', text: err.error?.message || 'Failed to create appointment' })
      }
    })
  }

}
