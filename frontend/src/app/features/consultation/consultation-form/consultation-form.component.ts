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
  Consultation,
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
  private router = inject(Router);
  private consultationService = inject(ConsultationService);
  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);

  consultationForm!: FormGroup;
  appointmentId = signal<string | null>(null);
  
  appointment = signal<Appointment | null>(null);
  patient = computed(() => this.appointment()?.patient);
  doctor = signal<User | null>(null);

  isLoading = signal(true);
  isSubmitting = signal(false);
  isModalOpen = signal(false);
  
  treatmentTypes = Object.values(TreatmentType);

  ngOnInit(): void {
    this.consultationForm = this.fb.group({
      notes: ['', [Validators.required]],
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
    
    this.authService.currentUser.subscribe(user => {
      if (user?.role === 'doctor') {
        this.doctor.set(user);
      }
    })
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
        this.isLoading.set(false);
      },
    });
  }

  get treatments(): FormArray {
    return this.consultationForm.get('treatments') as FormArray;
  }

  addTreatment(): void {
    const treatmentForm = this.fb.group({
      type: [TreatmentType.Medication, Validators.required],
      name: ['', Validators.required],
      dosage: [''],
      frequency: [''],
      duration: [''],
      notes: [''],
    });
    this.treatments.push(treatmentForm);
  }

  removeTreatment(index: number): void {
    this.treatments.removeAt(index);
  }

  openModal() {
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
    const doctorId = this.doctor()?.id;
    const patientId = this.patient()?.id;

    if (!appointmentId || !doctorId || !patientId) {
      console.error('Missing required IDs for submission');
      this.isSubmitting.set(false);
      // Optionally: show a user-facing error
      return;
    }

    const payload = {
      ...this.consultationForm.value,
      appointmentId,
      doctorId,
      patientId,
    };

    this.consultationService.create(payload).subscribe({
      next: (consultation) => {
        console.log('Consultation saved:', consultation);
        this.isSubmitting.set(false);
        this.closeModal();
        this.router.navigate(['/doctor/dashboard']); // Or a success page
      },
      error: (err) => {
        console.error('Failed to save consultation', err);
        this.isSubmitting.set(false);
        // Optionally: show a user-facing error
      },
    });
  }
}
