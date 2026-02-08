import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Consultation, ConsultationService } from '../../../core/services/consultation.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-consultation-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consultation-view.component.html',
  styleUrls: ['./consultation-view.component.css']
})
export class ConsultationViewComponent implements OnInit {
  consultation: Consultation | null = null;
  appointmentId!: string;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private consultationService = inject(ConsultationService);

  ngOnInit(): void {
    this.appointmentId = this.route.snapshot.paramMap.get('appointmentId')!;
    this.consultationService.getConsultationByAppointment(this.appointmentId).subscribe(consultation => {
      if (!consultation) {
        this.router.navigate(['/doctor/appointments']);
        return;
      }
      this.consultation = consultation;
    });
  }

  goBack() {
    this.router.navigate(['/patient/appointments']);
  }
}
