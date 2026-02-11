import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  ConsultationService,
  TreatmentType,
  CreateConsultationDto,
} from '../../../core/services/consultation.service';
import { CommonModule } from '@angular/common';
import {
  trigger,
  transition,
  style,
  animate,
} from '@angular/animations';
import { DoctorHeaderComponent } from '../../doctor/shared/doctor-header/doctor-header.component';
import { AppointmentService } from '@core/services/appointment.service';
import { Appointment } from '@core/models/appointment.model';
import { AuthService } from '@core/services/auth.service';
import { User } from '@core/models/user.model';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-consultation-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    DoctorHeaderComponent,
  ],
  templateUrl: './consultation-form.component.html',
  styleUrls: ['./consultation-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '500ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('modalAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ]),
    ]),
  ],
})
export class ConsultationFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  public router = inject(Router);
  private consultationService = inject(ConsultationService);
  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  consultationForm!: FormGroup;
  appointmentId = signal<string | null>(null);
  
  appointment = signal<Appointment | null>(null);
  patient = computed(() => this.appointment()?.patient);
  doctor = signal<User | null>(null);

  isLoading = signal(true);
  isSubmitting = signal(false);
  isModalOpen = signal(false);
  
  treatmentTypes = Object.values(TreatmentType);

  // Treatment icon helper
  getTreatmentIcon(type: TreatmentType): string {
    switch (type) {
      case TreatmentType.MEDICATION: return 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z';
      case TreatmentType.THERAPY: return 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z';
      case TreatmentType.PROCEDURE: return 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z';
      case TreatmentType.LAB_TEST: return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      default: return 'M13 10V3L4 14h7v7l9-11h-7z';
    }
  }

  getTreatmentColor(type: TreatmentType): string {
    switch (type) {
      case TreatmentType.MEDICATION: return 'blue';
      case TreatmentType.THERAPY: return 'pink';
      case TreatmentType.PROCEDURE: return 'amber';
      case TreatmentType.LAB_TEST: return 'purple';
      default: return 'gray';
    }
  }

  ngOnInit(): void {
    this.consultationForm = this.fb.group({
      notes: ['', [Validators.required, Validators.minLength(10)]],
      treatments: this.fb.array([]),
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('appointmentId');
      this.appointmentId.set(id);
      if (id) {
        this.loadInitialData(id);
      } else {
        this.isLoading.set(false);
      }
    });
    
    const currentUser = this.authService.currentUser();
    if (currentUser?.role === 'doctor') {
      this.doctor.set(currentUser);
    }
  }

  loadInitialData(appointmentId: string): void {
    this.isLoading.set(true);
    this.appointmentService.getAppointmentById(appointmentId).subscribe({
      next: (appointment) => {
        this.appointment.set(appointment);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load appointment data', err);
        this.toastService.error('Failed to load appointment');
        this.isLoading.set(false);
      },
    });
  }

  get treatments(): FormArray {
    return this.consultationForm.get('treatments') as FormArray;
  }

  addTreatment(): void {
    const treatmentForm = this.fb.group({
      type: [TreatmentType.MEDICATION, Validators.required],
      details: ['', Validators.required],
      instructions: [''],
      administered: [false],
    });
    this.treatments.push(treatmentForm);
  }

  removeTreatment(index: number): void {
    this.treatments.removeAt(index);
  }

  openModal() {
    if (this.consultationForm.invalid) {
      this.consultationForm.markAllAsTouched();
      this.toastService.error('Please fill in all required fields');
      return;
    }
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  onSubmit(): void {
    if (this.consultationForm.invalid) {
      this.consultationForm.markAllAsTouched();
      return;
    }
    
    this.isSubmitting.set(true);
    const appointmentId = this.appointmentId();

    if (!appointmentId) {
      this.toastService.error('Missing appointment ID');
      this.isSubmitting.set(false);
      return;
    }

    const formValue = this.consultationForm.value;
    const payload: CreateConsultationDto = {
      appointmentId,
      notes: formValue.notes,
      treatments: formValue.treatments.map((t: any) => ({
        type: t.type,
        details: t.details,
        instructions: t.instructions || undefined,
        administered: t.administered || false,
      })),
    };

    this.consultationService.create(payload).subscribe({
      next: (consultation) => {
        this.toastService.success('Consultation saved successfully');
        this.isSubmitting.set(false);
        this.closeModal();
        this.router.navigate(['/doctor/appointments']);
      },
      error: (err) => {
        console.error('Failed to save consultation', err);
        this.toastService.error('Failed to save consultation');
        this.isSubmitting.set(false);
      },
    });
  }
}
