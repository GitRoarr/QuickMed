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
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

type DoctorCard = Doctor & {
  nextAvailableDate?: string | null;
  availableToday?: boolean;
};

@Component({
  selector: 'app-patient-doctors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PatientShellComponent],
  templateUrl: './doctors.component.html',
  styleUrls: ['./doctors.component.css']
})

export class DoctorsComponent implements OnInit {
  doctors = signal<DoctorCard[]>([]);
  filteredDoctors = signal<DoctorCard[]>([]);
  isLoading = signal(true);
  selectedDoctor = signal<Doctor | null>(null);
  ratingDoctor = signal<Doctor | null>(null);
  ratingValue = signal<number>(0);
  ratingSubmitting = signal(false);
  showBookingForm = signal(false);
  searchQuery = signal('');
  selectedSpecialty = signal('all');
  availableSlots = signal<DoctorSlot[]>([]);
  nextAvailableDate = signal<string | null>(null);

  // Manual time picker input
  manualTimeInput: string = '';

  morningSlots = computed(() => this.groupSlotsByRange(0, 12));
  afternoonSlots = computed(() => this.groupSlotsByRange(12, 17));
  eveningSlots = computed(() => this.groupSlotsByRange(17, 24));

  appointmentForm: FormGroup;
  doctorServices = signal<any[]>([]);
  selectedServiceId = signal<string>('');

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
      serviceId: [''],
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

        const doctorsWithData: DoctorCard[] = docs.map(doc => {
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
        this.doctors.set(doctorsWithData);
        this.filteredDoctors.set(doctorsWithData);
        this.loadDoctorAvailability(doctorsWithData);
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
    // Load doctor services
    this.loadDoctorServices(doctor.id);
    // Default date = today or next available date; start by loading today's slots
    const date = this.getCurrentDate();
    this.appointmentForm.patchValue({ appointmentDate: date, appointmentTime: '', serviceId: '' });
    this.loadAvailableSlots(date);
  }

  loadDoctorServices(doctorId: string): void {
    // We can use SchedulingService or a specific settings endpoint.
    // Assuming a generic endpoint exists or adding one.
    this.appointmentService.getDoctorServices(doctorId).subscribe({
      next: (services: any[]) => this.doctorServices.set(services || []),
      error: () => this.doctorServices.set([])
    });
  }

  onServiceSelect(serviceId: string): void {
    this.selectedServiceId.set(serviceId);
    this.appointmentForm.patchValue({ serviceId });
  }

  getSelectedService(): any {
    return this.doctorServices().find(s => s.id === this.selectedServiceId());
  }

  getDisplayFee(): number {
    const service = this.getSelectedService();
    if (service) return Number(service.price);
    return Number(this.selectedDoctor()?.consultationFee || 50);
  }

  closeBookingForm(): void {
    this.showBookingForm.set(false);
    this.selectedDoctor.set(null);
    this.appointmentForm.reset();
    this.availableSlots.set([]);
    this.nextAvailableDate.set(null);
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

    // Check against schedule availability
    const isAvailable = this.availableSlots().some(s => (s.startTime || s.time) === time);
    if (!isAvailable) {
      this.toast.error('Selected time is not available. Please choose from the available slots.', { title: 'Invalid Selection' });
      return;
    }

    const payload = {
      doctorId: this.selectedDoctor()!.id,
      appointmentDate: date,
      appointmentTime: time,
      serviceId: this.appointmentForm.value.serviceId,
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

  private groupSlotsByRange(startHour: number, endHour: number): DoctorSlot[] {
    return this.availableSlots().filter(s => {
      const time = s.startTime || s.time || '';
      if (!time) return false;
      const [h] = time.split(':').map(Number);
      return h >= startHour && h < endHour;
    });
  }

  private loadDoctorAvailability(doctors: DoctorCard[]): void {
    if (!doctors.length) return;
    const today = this.getCurrentDate();

    const requests = doctors.map((doc) =>
      this.schedulingService.getAvailableDates(doc.id, today, 14).pipe(
        map((dates) => {
          const nextDate = (dates || []).find((d) => d >= today) || null;
          const availableToday = nextDate === today;
          const mergedAvailable = availableToday || !!doc.available;
          return {
            ...doc,
            available: mergedAvailable,
            availableToday,
            nextAvailableDate: nextDate,
          } as DoctorCard;
        }),
        catchError(() => of({
          ...doc,
          // On error, keep whatever availability we already had
          available: !!doc.available,
          availableToday: !!doc.available,
          nextAvailableDate: doc.nextAvailableDate ?? null,
        } as DoctorCard))
      )
    );

    forkJoin(requests).subscribe((updated) => {
      this.doctors.set(updated);
      this.filteredDoctors.set(updated);
      this.filterDoctors();
    });
  }

  loadAvailableSlots(dateStr?: string, allowFallback = true): void {
    const doctor = this.selectedDoctor();
    if (!doctor) return;
    const date = dateStr || this.appointmentForm.value.appointmentDate;
    if (!date) {
      this.availableSlots.set([]);
      this.nextAvailableDate.set(null);
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
          startTime: this.normalizeTime(s.startTime || s.time || ''),
          endTime: this.normalizeTime(s.endTime || s.startTime || s.time || ''),
          status: s.status
        } as DoctorSlot));
        // Remove duplicates and sort
        const unique = Array.from(new Map(normalized.map(s => [s.startTime, s])).values())
          .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        this.availableSlots.set(unique);
        this.nextAvailableDate.set(null);

        if (unique.length === 0 && allowFallback) {
          this.loadNextAvailableDate(date);
          return;
        }
        // If current selected time not in list, clear it
        const current = this.appointmentForm.value.appointmentTime;
        if (current && !unique.some(s => s.startTime === current)) {
          this.appointmentForm.patchValue({ appointmentTime: '' });
        }
      },
      error: () => {
        this.availableSlots.set([]);
        this.nextAvailableDate.set(null);
      }
    });
  }

  private loadNextAvailableDate(currentDate: string): void {
    const doctor = this.selectedDoctor();
    if (!doctor) return;
    this.schedulingService.getAvailableDates(doctor.id, currentDate, 30).subscribe({
      next: (dates) => {
        const nextDate = (dates || []).find(d => d >= currentDate && d !== currentDate) || null;
        this.nextAvailableDate.set(nextDate);
        if (nextDate) {
          this.appointmentForm.patchValue({ appointmentDate: nextDate, appointmentTime: '' });
          this.loadAvailableSlots(nextDate, false);
        }
      },
      error: () => this.nextAvailableDate.set(null),
    });
  }

  selectTimeSlot(slot: DoctorSlot): void {
    const time = slot.startTime || slot.time || '';
    this.appointmentForm.patchValue({ appointmentTime: time });
    // Clear manual input when slot is clicked
    this.manualTimeInput = '';
  }

  isTimeSlotSelected(slot: DoctorSlot): boolean {
    return this.appointmentForm.value.appointmentTime === (slot.startTime || slot.time || '');
  }

  /**
   * Validates and sets manually entered time
   * Checks if the time falls within any available slot
   */
  onManualTimeChange(): void {
    if (!this.manualTimeInput) {
      this.appointmentForm.patchValue({ appointmentTime: '' });
      return;
    }

    const enteredTime = this.manualTimeInput; // Format: HH:MM (24-hour)
    const slots = this.availableSlots();

    if (slots.length === 0) {
      this.toast.error('No available slots for this date', { title: 'Invalid Time' });
      this.manualTimeInput = '';
      return;
    }

    // Convert time to minutes for easier comparison
    const toMinutes = (time: string): number => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const enteredMinutes = toMinutes(enteredTime);

    // Check if entered time falls within any available slot
    const matchingSlot = slots.find(slot => {
      const startMinutes = toMinutes(slot.startTime || '00:00');
      // A slot is typically 30 mins, so we check if the time is within the start and end of any slot.
      // Assuming 30-minute slots if no end time is provided.
      const endMinutes = slot.endTime ? toMinutes(slot.endTime) : startMinutes + 30;

      // Time must be >= start and < end
      return enteredMinutes >= startMinutes && enteredMinutes < endMinutes;
    });

    if (matchingSlot) {
      // Valid time within an available slot
      this.appointmentForm.patchValue({ appointmentTime: enteredTime });
      this.toast.success(`Time ${this.formatTime12Hour(enteredTime)} is available`, {
        title: 'Valid Selection'
      });
    } else {
      // Invalid time - not within any available slot
      this.toast.error(
        `Time ${this.formatTime12Hour(enteredTime)} is not within the doctor's available slots. Please choose from the available time slots above.`,
        { title: 'Invalid Time' }
      );
      this.manualTimeInput = '';
      this.appointmentForm.patchValue({ appointmentTime: '' });
    }
  }

  /**
   * Format 24-hour time to 12-hour format with AM/PM
   */
  private formatTime12Hour(time: string): string {
    const [hStr, mStr] = time.split(':');
    const h = Number(hStr);
    const m = Number(mStr) || 0;
    const period = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, '0')} ${period}`;
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

  private normalizeTime(time: string): string {
    if (!time) return '';
    const [hRaw, mRaw] = time.split(':');
    const h = String(hRaw || '').padStart(2, '0');
    const m = String(mRaw || '00').padStart(2, '0');
    return `${h}:${m}`;
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
