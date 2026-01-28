import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Doctor } from '../../../core/models/user.model';
import { Router } from '@angular/router';
import { PatientShellComponent } from '../shared/patient-shell/patient-shell.component';
import { ReviewService, CreateReviewDto } from '../../../core/services/review.service';
import { SchedulingService, DoctorSlot } from '../../../core/services/schedule.service';

import { ToastService } from '../../../core/services/toast.service';

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

  morningSlots = computed(() =>
    this.availableSlots().filter(s => {
      const time = s.startTime || s.time || '';
      return time >= '09:00' && time < '12:00';
    })
  );

  eveningSlots = computed(() =>
    this.availableSlots().filter(s => {
      const time = s.startTime || s.time || '';
      return time >= '14:00' && time < '20:00';
    })
  );

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
    private schedulingService: SchedulingService,
    private toast: ToastService
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
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = dayNames[new Date().getDay()];
        const normalize = (s: string) => (s || '').toLowerCase();
        const isAvailableToday = (d: any) => {
          const days: string[] = d.availableDays || [];
          const hasDays = Array.isArray(days) && days.length > 0;
          if (!hasDays) return false;
          const normalizedDays = days.map(normalize);
          // Support both full and short day names
          const shortNames: Record<string, string> = {
            sunday: 'sun', monday: 'mon', tuesday: 'tue', wednesday: 'wed', thursday: 'thu', friday: 'fri', saturday: 'sat'
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

    const date = this.appointmentForm.value.appointmentDate;
    const time = this.appointmentForm.value.appointmentTime;

    // Creative Prevention: Double-check past time before submitting
    if (this.isPastTime(date, time)) {
      this.toast.error('You cannot book for passed time', { title: 'Time Expired' });
      return;
    }

    // New: Check if time is within doctor's working range
    if (!this.isWithinDoctorRange(time)) {
      const doctor = this.selectedDoctor();
      const range = doctor ? `${this.formatTime12(doctor.startTime || '09:00')} - ${this.formatTime12(doctor.endTime || '17:00')}` : 'working hours';
      this.toast.error(`Please select a time within the doctor\'s ${range}`, { title: 'Invalid Selection' });
      return;
    }

    const payload = {
      doctorId: this.selectedDoctor()!.id,
      appointmentDate: date,
      appointmentTime: time,
      notes: this.appointmentForm.value.notes,
    };

    this.appointmentService.create(payload).subscribe({
      next: (res) => {
        // successfully created - redirect to payment
        this.closeBookingForm();
        this.toast.success('Appointment requested successfully!', { title: 'Success' });
        this.router.navigate(['/patient/payment'], {
          queryParams: { appointmentId: res.id }
        });
      },
      error: (err) => {
        console.error('Failed to book appointment', err);
        const serverMsg = err?.error?.message || err?.message || 'Failed to book appointment. Please try again.';
        const msg = Array.isArray(serverMsg) ? serverMsg.join('\n') : serverMsg;
        this.toast.error(msg, { title: 'Booking Error' });
      }
    });
  }

  private isPastTime(dateStr: string, timeStr: string): boolean {
    const now = new Date();
    const todayStr = this.getCurrentDate();
    if (dateStr < todayStr) return true;
    if (dateStr > todayStr) return false;

    // It's today, check time
    const [h, m] = timeStr.split(':').map(Number);
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    return h < currentH || (h === currentH && m < currentM);
  }

  private isWithinDoctorRange(timeStr: string): boolean {
    const doctor = this.selectedDoctor();
    if (!doctor || !doctor.startTime || !doctor.endTime) return true; // Fallback if no specific range

    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const currentMin = toMin(timeStr);
    const startMin = toMin(doctor.startTime);
    const endMin = toMin(doctor.endTime);

    return currentMin >= startMin && currentMin < endMin;
  }

  private formatTime12(time: string): string {
    const [hStr, mStr] = time.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    const period = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, '0')} ${period}`;
  }

  loadAvailableSlots(dateStr?: string): void {
    const doctor = this.selectedDoctor();
    if (!doctor) return;
    const date = dateStr || this.appointmentForm.value.appointmentDate;
    if (!date) {
      this.availableSlots.set([]);
      return;
    }
    this.schedulingService.getDaySchedulePublic(doctor.id, date).subscribe({
      next: (slots) => {
        // Filter out slots that are NOT 'available' OR are in the past
        const available = (slots || []).filter(s => {
          if (s.status !== 'available') return false;

          const time = s.startTime || s.time || '';
          return !this.isPastTime(date, time);
        });

        // Normalize time values to HH:mm and include end time
        const normalized = available.map(s => ({
          startTime: (s.startTime || s.time || '').slice(0, 5),
          endTime: (s.endTime || s.startTime || s.time || '').slice(0, 5),
          status: s.status
        } as DoctorSlot));
        // Remove duplicates and sort
        const unique = Array.from(new Map(normalized.map(s => [s.startTime, s])).values())
          .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        this.availableSlots.set(unique);
        // If current selected time not in list, clear it
        const current = this.appointmentForm.value.appointmentTime;
        if (current && !unique.some(s => s.startTime === current)) {
          this.appointmentForm.patchValue({ appointmentTime: '' });
        }
      },
      error: () => {
        this.availableSlots.set([]);
      }
    });
  }

  selectTimeSlot(slot: DoctorSlot): void {
    const time = slot.startTime || slot.time || '';
    this.appointmentForm.patchValue({ appointmentTime: time });
  }

  isTimeSlotSelected(slot: DoctorSlot): boolean {
    return this.appointmentForm.value.appointmentTime === (slot.startTime || slot.time || '');
  }

  formatSlotTime(slot: DoctorSlot): string {
    const start = slot.startTime || slot.time || '';
    const end = slot.endTime || '';
    if (!start) return '';
    const formatTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return `${hr}:${String(m).padStart(2, '0')} ${period}`;
    };
    return end ? `${formatTime(start)} - ${formatTime(end)}` : formatTime(start);
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
