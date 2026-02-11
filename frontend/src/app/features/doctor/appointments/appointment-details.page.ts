import { DoctorService } from '@core/services/doctor.service';
import { ActivatedRoute } from '@angular/router';
import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-appointment-details-page',
  templateUrl: './appointment-details.page.html',
  styleUrls: ['./appointment-details.page.css']
})
export class AppointmentDetailsPage implements OnInit {
  @Input() appointmentId: string | null = null;
  appointment: any = null;
  isLoading = true;
  appointments: any[] = [];
  patientId: string | null = null;

  constructor(private doctorService: DoctorService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('patientId');
    if (this.patientId) {
      this.isLoading = true;
      this.doctorService.getAppointmentsForPatient(this.patientId).subscribe({
        next: (data) => {
          this.appointments = data;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.appointments = [];
        }
      });
    }
    const id = this.appointmentId || this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.isLoading = true;
    this.doctorService.getAppointmentDetails(id).subscribe({
      next: (data) => {
        this.appointment = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.appointment = null;
      }
    });
  }

  getInitials(patient: any): string {
    if (!patient) return '';
    return (patient.firstName?.charAt(0) || '') + (patient.lastName?.charAt(0) || '');
  }
}
