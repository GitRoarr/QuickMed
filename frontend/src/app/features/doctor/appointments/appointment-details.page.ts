import { Component, OnInit } from '@angular/core';
import { DoctorService } from '@core/services/doctor.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-appointment-details-page',
  templateUrl: './appointment-details.page.html',
  styleUrls: ['./appointment-details.page.css']
})
export class AppointmentDetailsPage implements OnInit {
  @Input() appointmentId: string | null = null;
  appointment: any = null;
  isLoading = true;

  constructor(private doctorService: DoctorService, private route: ActivatedRoute) {}

  ngOnInit(): void {
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
