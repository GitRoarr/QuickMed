import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Consultation, ConsultationService, TreatmentType } from '../../../core/services/consultation.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-consultation-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './consultation-view.component.html',
  styleUrls: ['./consultation-view.component.css']
})
export class ConsultationViewComponent implements OnInit {
  consultation = signal<Consultation | null>(null);
  loading = signal(true);
  appointmentId!: string;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private consultationService = inject(ConsultationService);

  // Treatment stats
  treatmentStats = computed(() => {
    const c = this.consultation();
    if (!c?.treatments) return { total: 0, medications: 0, therapies: 0, procedures: 0, labTests: 0 };

    return {
      total: c.treatments.length,
      medications: c.treatments.filter(t => t.type === TreatmentType.MEDICATION).length,
      therapies: c.treatments.filter(t => t.type === TreatmentType.THERAPY).length,
      procedures: c.treatments.filter(t => t.type === TreatmentType.PROCEDURE).length,
      labTests: c.treatments.filter(t => t.type === TreatmentType.LAB_TEST).length,
    };
  });

  ngOnInit(): void {
    this.appointmentId = this.route.snapshot.paramMap.get('appointmentId')!;
    this.loadConsultation();
  }

  private loadConsultation(): void {
    this.loading.set(true);
    this.consultationService.getConsultationByAppointment(this.appointmentId).subscribe({
      next: (consultation) => {
        if (!consultation) {
          this.router.navigate(['/patient/appointments']);
          return;
        }
        this.consultation.set(consultation);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/patient/appointments']);
      }
    });
  }

  getTreatmentIcon(type: TreatmentType): string {
    switch (type) {
      case TreatmentType.MEDICATION: return 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z';
      case TreatmentType.THERAPY: return 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z';
      case TreatmentType.PROCEDURE: return 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z';
      case TreatmentType.LAB_TEST: return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      default: return 'M13 10V3L4 14h7v7l9-11h-7z';
    }
  }

  getTreatmentColor(type: TreatmentType): { bg: string; text: string; icon: string } {
    switch (type) {
      case TreatmentType.MEDICATION:
        return { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-500' };
      case TreatmentType.THERAPY:
        return { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-300', icon: 'text-pink-500' };
      case TreatmentType.PROCEDURE:
        return { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' };
      case TreatmentType.LAB_TEST:
        return { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', icon: 'text-purple-500' };
      default:
        return { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', icon: 'text-gray-500' };
    }
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack() {
    this.router.navigate(['/patient/appointments']);
  }
}
