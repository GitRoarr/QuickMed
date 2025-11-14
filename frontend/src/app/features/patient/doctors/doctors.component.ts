import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  bio?: string;
  phoneNumber?: string;
  email?: string;
  rating?: number;
  experience?: number;
  available?: boolean;
}

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

  constructor(private fb: FormBuilder) {
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
    
    setTimeout(() => {
      const mockDoctors: Doctor[] = [
        {
          id: '1',
          firstName: 'Michael',
          lastName: 'Chen',
          specialty: 'Cardiology',
          bio: 'Specialized in cardiovascular diseases with 15+ years of experience',
          phoneNumber: '+1 (555) 123-4567',
          email: 'michael.chen@quickmed.com',
          rating: 4.8,
          experience: 15,
          available: true
        },
        {
          id: '2',
          firstName: 'Emily',
          lastName: 'Rodriguez',
          specialty: 'General Practice',
          bio: 'Family physician focused on preventive care and wellness',
          phoneNumber: '+1 (555) 234-5678',
          email: 'emily.rodriguez@quickmed.com',
          rating: 4.9,
          experience: 10,
          available: true
        },
        {
          id: '3',
          firstName: 'James',
          lastName: 'Wilson',
          specialty: 'Dermatology',
          bio: 'Expert in skin conditions and cosmetic dermatology',
          phoneNumber: '+1 (555) 345-6789',
          email: 'james.wilson@quickmed.com',
          rating: 4.7,
          experience: 12,
          available: false
        },
        {
          id: '4',
          firstName: 'Sarah',
          lastName: 'Martinez',
          specialty: 'Orthopedics',
          bio: 'Specialized in sports medicine and joint replacement',
          phoneNumber: '+1 (555) 456-7890',
          email: 'sarah.martinez@quickmed.com',
          rating: 4.9,
          experience: 18,
          available: true
        },
        {
          id: '5',
          firstName: 'David',
          lastName: 'Lee',
          specialty: 'Pediatrics',
          bio: 'Caring for children from newborns to adolescents',
          phoneNumber: '+1 (555) 567-8901',
          email: 'david.lee@quickmed.com',
          rating: 5.0,
          experience: 8,
          available: true
        },
        {
          id: '6',
          firstName: 'Lisa',
          lastName: 'Thompson',
          specialty: 'Cardiology',
          bio: 'Heart health specialist with focus on prevention',
          phoneNumber: '+1 (555) 678-9012',
          email: 'lisa.thompson@quickmed.com',
          rating: 4.8,
          experience: 14,
          available: true
        }
      ];

      this.doctors.set(mockDoctors);
      this.filteredDoctors.set(mockDoctors);
      this.isLoading.set(false);
    }, 1000);
  }

  filterDoctors(): void {
    let filtered = [...this.doctors()];

    if (this.selectedSpecialty() !== 'all') {
      filtered = filtered.filter(doc => 
        doc.specialty.toLowerCase() === this.selectedSpecialty().toLowerCase()
      );
    }

    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(doc =>
        `${doc.firstName} ${doc.lastName}`.toLowerCase().includes(query) ||
        doc.specialty.toLowerCase().includes(query) ||
        doc.bio?.toLowerCase().includes(query)
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

    console.log('Booking appointment:', {
      ...this.appointmentForm.value,
      doctorId: this.selectedDoctor()?.id
    });

    alert('Appointment booked successfully!');
    this.closeBookingForm();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  getStarArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < Math.floor(rating) ? 1 : 0);
  }

  /** Return the initial letter for currently selected doctor (safe for template) */
  getSelectedDoctorInitial(): string {
    const d = this.selectedDoctor();
    return d?.firstName?.charAt(0) ?? '';
  }

  /** Return today's date in YYYY-MM-DD for date input min attribute */
  getCurrentDate(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
