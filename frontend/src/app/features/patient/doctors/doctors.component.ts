import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Doctor } from '../../../core/models/user.model';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-patient-doctors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './doctors.component.html',
  styleUrls: ['./doctors.component.css']
})
export class DoctorsComponent implements OnInit {
  doctors = signal<Doctor[]>([]);
  filteredDoctors = signal<Doctor[]>([]);
  isLoading = signal(true);
  selectedDoctor = signal<Doctor | null>(null);
  showBookingForm = signal(false);
  searchQuery = signal('');
  selectedSpecialty = signal('all');
  sidebarCollapsed = signal(false);
  
  appointmentForm: FormGroup;

  menuItems = [
    { label: 'Dashboard', icon: 'bi-house', route: '/patient/dashboard', active: false },
    { label: 'My Appointments', icon: 'bi-calendar-check', route: '/patient/appointments', active: false },
    { label: 'Find Doctors', icon: 'bi-people', route: '/patient/doctors', active: true },
    { label: 'Medical Records', icon: 'bi-file-medical', route: '/patient/records', active: false }
  ];

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
    private appointmentService: AppointmentService
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
        const doctorsWithData = docs.map(doc => ({
          ...doc,
          available: doc.available !== undefined ? doc.available : false,
          rating: doc.rating || 0,
          experience: doc.experience || 0,
        }));
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
  }

  closeBookingForm(): void {
    this.showBookingForm.set(false);
    this.selectedDoctor.set(null);
    this.appointmentForm.reset();
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
        alert('Failed to book appointment. Please try again.');
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
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
  goHome(){
    this.router.navigate(['/']);
  }

  getCurrentDate(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
