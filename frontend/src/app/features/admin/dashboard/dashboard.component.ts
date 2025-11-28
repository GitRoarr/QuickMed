import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar';
import { HeaderComponent } from '../shared/header';
import { AdminService } from '@app/core/services/admin.service';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent, AlertMessageComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  menuItems = [
    { label: 'Overview', icon: 'grid', route: '/admin/overview' },
    { label: 'Appointments', icon: 'calendar', route: '/admin/appointments' },
    { label: 'Patients', icon: 'people', route: '/admin/patients' },
    { label: 'Doctors', icon: 'https://img.icons8.com/ios-filled/50/000000/stethoscope.png', route: '/admin/doctors' },
    { label: 'User Management', icon: 'https://img.icons8.com/ios-filled/50/000000/user-group.png', route: '/admin/users' },
    { label: 'Analytics', icon: 'bar-chart', route: '/admin/analytics' },
    { label: 'Settings', icon: 'gear', route: '/admin/settings' }
  ];


  ngOnInit() {
  }

  private adminService = inject(AdminService)

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

    this.adminService.createAppointment(payload).subscribe({
      next: (res) => {
        this.apptAlert.set({ type: 'success', text: 'Appointment created successfully.' })
        setTimeout(() => this.closeNewAppointment(), 800)
      },
      error: (err) => {
        console.error('Create appointment failed', err)
        this.apptAlert.set({ type: 'error', text: err.error?.message || 'Failed to create appointment' })
      }
    })
  }

}
