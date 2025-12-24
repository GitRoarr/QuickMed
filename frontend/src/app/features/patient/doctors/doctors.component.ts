import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Doctor } from '../../../core/models/user.model';
import { Router } from '@angular/router';
import { PatientShellComponent } from '../shared/patient-shell/patient-shell.component';
import { ReviewService, CreateReviewDto } from '../../../core/services/review.service';
import { SchedulingService, DoctorSlot } from '../../../core/services/schedule.service';

@Component({
  selector: 'app-patient-doctors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PatientShellComponent],
  templateUrl: './doctors.component.html',
  styleUrls: ['./doctors.component.css']
})
export class DoctorsComponent implements OnInit {
  doctors = signal<Doctor[]>([]);
  filteredDoctors = signal<Doctor[]>([]);
  isLoading = signal(true);
  selectedDoctor = signal<Doctor | null>(null);
  ratingDoctor = signal<Doctor | null>(null);
  ratingValue = signal<number>(0);
  ratingSubmitting = signal(false);
  showBookingForm = signal(false);
  searchQuery = signal('');
  selectedSpecialty = signal('all');
  availableSlots = signal<DoctorSlot[]>([]);
  
  appointmentForm: FormGroup;

  specialties = [
    { value: 'all', label: 'All Specialties' },
    { value: 'cardiology', label: 'Cardiology' },
    { value: 'dermatology', label: 'Dermatology' },
    { value: 'general', label: 'General Practice' },
    { value: 'orthopedics', label: 'Orthopedics' },
    { value: 'pediatrics', label: 'Pediatrics' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    private appointmentService: AppointmentService,
    private reviewService: ReviewService,
    private schedulingService: SchedulingService
  ) {
    this.appointmentForm = this.fb.group({
      appointmentDate: ['', Validators.required],
      appointmentTime: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadDoctors();
  }

  loadDoctors(): void {
    this.isLoading.set(true);

    this.userService.getDoctors().subscribe({
      next: (docs: any[]) => {
        // Backend now returns doctors with availability, rating, and experience
        const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const todayName = dayNames[new Date().getDay()];
        const normalize = (s: string) => (s || '').toLowerCase();
        const isAvailableToday = (d: any) => {
          const days: string[] = d.availableDays || [];
          const hasDays = Array.isArray(days) && days.length > 0;
          if (!hasDays) return false;
          const normalizedDays = days.map(normalize);
          // Support both full and short day names
          const shortNames: Record<string,string> = {
            sunday:'sun', monday:'mon', tuesday:'tue', wednesday:'wed', thursday:'thu', friday:'fri', saturday:'sat'
          };
          const tn = normalize(todayName);
          return normalizedDays.includes(tn) || normalizedDays.includes(shortNames[tn]);
        };

        const doctorsWithData = docs.map(doc => {
          const experience =
            doc.experienceYears ??
            doc.experience ??
            0;
          return {
            ...doc,
            available: doc.available !== undefined ? doc.available : isAvailableToday(doc),
            rating: doc.rating || 0,
            ratingCount: doc.ratingCount || 0,
            experience,
          };
        });
        this.doctors.set(doctorsWithData as Doctor[]);
        this.filteredDoctors.set(doctorsWithData as Doctor[]);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load doctors', err);
        this.doctors.set([]);
        this.filteredDoctors.set([]);
        this.isLoading.set(false);
      }
    });
  }

  filterDoctors(): void {
    let filtered = [...this.doctors()];

    if (this.selectedSpecialty() !== 'all') {
      filtered = filtered.filter(doc => 
        (doc.specialty ?? '').toLowerCase() === this.selectedSpecialty().toLowerCase()
      );
    }

    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(doc =>
        `${doc.firstName ?? ''} ${doc.lastName ?? ''}`.toLowerCase().includes(query) ||
        (doc.specialty ?? '').toLowerCase().includes(query) ||
        (doc.bio ?? '').toLowerCase().includes(query)
      );
    }

    this.filteredDoctors.set(filtered);
  }

  onSearchChange(): void {
    this.filterDoctors();
  }

  onSpecialtyChange(): void {
    this.filterDoctors();
  }

  selectDoctor(doctor: Doctor): void {
    this.selectedDoctor.set(doctor);
    this.showBookingForm.set(true);
    // Default date = today or next available date; start by loading today's slots
    const date = this.getCurrentDate();
    this.appointmentForm.patchValue({ appointmentDate: date, appointmentTime: '' });
    this.loadAvailableSlots(date);
  }

  closeBookingForm(): void {
    this.showBookingForm.set(false);
    this.selectedDoctor.set(null);
    this.appointmentForm.reset();
    this.availableSlots.set([]);
  }

  bookAppointment(): void {
    if (this.appointmentForm.invalid || !this.selectedDoctor()) {
      return;
    }

    const payload = {
      doctorId: this.selectedDoctor()!.id,
      appointmentDate: this.appointmentForm.value.appointmentDate,
      appointmentTime: this.appointmentForm.value.appointmentTime,
      notes: this.appointmentForm.value.notes,
    };

    this.appointmentService.create(payload).subscribe({
      next: (res) => {
        // successfully created - redirect to payment
        this.closeBookingForm();
        this.router.navigate(['/patient/payment'], {
          queryParams: { appointmentId: res.id }
        });
      },
      error: (err) => {
        console.error('Failed to book appointment', err);
        const serverMsg = err?.error?.message || err?.message || 'Failed to book appointment. Please try again.';
        // If message is array (class-validator), join it
        const msg = Array.isArray(serverMsg) ? serverMsg.join('\n') : serverMsg;
        alert(msg);
      }
    });
  }

  loadAvailableSlots(dateStr?: string): void {
    const doctor = this.selectedDoctor();
    if (!doctor) return;
    const date = dateStr || this.appointmentForm.value.appointmentDate;
    if (!date) return;
    this.schedulingService.getDaySchedulePublic(doctor.id, date).subscribe({
      next: (slots) => {
        const available = (slots || []).filter(s => s.status === 'available');
        // Normalize time values to HH:mm
        const normalize = (s: DoctorSlot) => (s.startTime || s.time || '').slice(0,5);
        // Keep unique times and sort
        const times = Array.from(new Set(available.map(normalize))).sort();
        this.availableSlots.set(times.map(t => ({ startTime: t, status: 'available' } as DoctorSlot)));
        // If current selected time not in list, clear it
        const current = this.appointmentForm.value.appointmentTime;
        if (!times.includes(current)) {
          this.appointmentForm.patchValue({ appointmentTime: '' });
        }
      },
      error: () => {
        this.availableSlots.set([]);
      }
    });
  }

  onDateChange(): void {
    const date = this.appointmentForm.value.appointmentDate;
    this.loadAvailableSlots(date);
  }

  toggleSidebar(): void {
  }

  getStarArray(rating: number): number[] {
    const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5
    return Array(5).fill(0).map((_, i) => {
      if (i < Math.floor(roundedRating)) return 1;
      if (i === Math.floor(roundedRating) && roundedRating % 1 === 0.5) return 0.5; // Half star
      return 0;
    });
  }

  getSelectedDoctorInitial(): string {
    const d = this.selectedDoctor();
    return d?.firstName?.charAt(0) ?? '';
  }

  getCurrentDate(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  openRating(doctor: Doctor): void {
    this.ratingDoctor.set(doctor);
    this.ratingValue.set(0);
  }

  setRating(value: number): void {
    this.ratingValue.set(value);
  }

  submitRating(): void {
    const doctor = this.ratingDoctor();
    if (!doctor || this.ratingValue() <= 0) {
      return;
    }
    const payload: CreateReviewDto = {
      doctorId: doctor.id,
      rating: this.ratingValue(),
    };
    this.ratingSubmitting.set(true);
    this.reviewService.create(payload).subscribe({
      next: () => {
        // Reload doctors to update average rating
        this.loadDoctors();
        this.ratingSubmitting.set(false);
        this.ratingDoctor.set(null);
      },
      error: (err) => {
        console.error('Failed to submit rating', err);
        this.ratingSubmitting.set(false);
        alert(err?.error?.message || 'Failed to submit rating');
      },
    });
  }

  closeRating(): void {
    this.ratingDoctor.set(null);
  }
}
