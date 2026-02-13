import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ConsultationService,
    Consultation,
    TreatmentType,
} from '../../../core/services/consultation.service';

@Component({
    selector: 'app-consultation-view-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './consultation-view-modal.component.html',
    styleUrls: ['./consultation-view-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsultationViewModalComponent implements OnInit {
    @Input() appointmentId!: string;
    @Output() close = new EventEmitter<void>();

    private consultationService = inject(ConsultationService);

    consultation = signal<Consultation | null>(null);
    loading = signal(true);
    error = signal<string | null>(null);

    // Treatment stats
    treatmentStats = computed(() => {
        const c = this.consultation();
        if (!c?.treatments)
            return { total: 0, medications: 0, therapies: 0, procedures: 0, labTests: 0 };

        return {
            total: c.treatments.length,
            medications: c.treatments.filter((t) => t.type === TreatmentType.MEDICATION).length,
            therapies: c.treatments.filter((t) => t.type === TreatmentType.THERAPY).length,
            procedures: c.treatments.filter((t) => t.type === TreatmentType.PROCEDURE).length,
            labTests: c.treatments.filter((t) => t.type === TreatmentType.LAB_TEST).length,
        };
    });

    ngOnInit(): void {
        this.loadConsultation();
    }

    private loadConsultation(): void {
        this.loading.set(true);
        this.error.set(null);

        this.consultationService.getConsultationByAppointment(this.appointmentId).subscribe({
            next: (consultation) => {
                if (!consultation) {
                    this.error.set('No consultation found for this appointment.');
                }
                this.consultation.set(consultation);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Failed to load consultation data.');
                this.loading.set(false);
            },
        });
    }

    onBackdropClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('cv-backdrop')) {
            this.close.emit();
        }
    }

    onClose(): void {
        this.close.emit();
    }

    getTreatmentIcon(type: string): string {
        switch (type) {
            case TreatmentType.MEDICATION:
                return 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z';
            case TreatmentType.THERAPY:
                return 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z';
            case TreatmentType.PROCEDURE:
                return 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z';
            case TreatmentType.LAB_TEST:
                return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
            default:
                return 'M13 10V3L4 14h7v7l9-11h-7z';
        }
    }

    getTreatmentLabel(type: string): string {
        return (type || 'unknown').replace('_', ' ');
    }

    getTreatmentColorClass(type: string): string {
        switch (type) {
            case TreatmentType.MEDICATION: return 'cv-type-medication';
            case TreatmentType.THERAPY: return 'cv-type-therapy';
            case TreatmentType.PROCEDURE: return 'cv-type-procedure';
            case TreatmentType.LAB_TEST: return 'cv-type-lab';
            default: return 'cv-type-default';
        }
    }

    formatDate(date: Date | string | undefined): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    formatDateTime(date: Date | string | undefined): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    printConsultation(): void {
        window.print();
    }
}
