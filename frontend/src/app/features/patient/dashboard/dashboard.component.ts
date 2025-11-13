import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  bloodType?: string;
  patientId?: string;
  allergies?: string[];
}

interface Appointment {
  id: string;
  doctor: { firstName: string; lastName: string; specialty: string };
  appointmentDate: string;
  appointmentTime: string;
  location?: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  isVideoConsultation?: boolean;
}

interface MedicalRecord {
  id: string;
  date: string;
  doctor: string;
  diagnosis: string;
  notes: string;
}

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  prescribedBy: string;
  startDate: string;
  refills: number;
  status: 'active' | 'completed';
}

interface TestResult {
  id: string;
  test: string;
  date: string;
  status: string;
  orderedBy: string;
}

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl : './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Signals
  isLoading = signal(true);
  activeTab = signal<'appointments' | 'history' | 'prescriptions' | 'tests'>('appointments');
  searchQuery = signal('');
  user = signal<User | null>(null);

  appointments = signal<Appointment[]>([]);
  medicalHistory = signal<MedicalRecord[]>([]);
  prescriptions = signal<Prescription[]>([]);
  testResults = signal<TestResult[]>([]);

  stats = signal({
    upcomingAppointments: 0,
    activeMeds: 0,
    records: 0,
    testResults: 0
  });

  ngOnInit(): void {
    this.loadUser();
    this.loadAppointments();
    this.loadMedicalHistory();
    this.loadPrescriptions();
    this.loadTestResults();
  }

  private loadUser() {
    this.http.get<User>('/api/patient/profile')
      .pipe(
        catchError(err => {
          console.error('Failed to load user', err);
          return of(null);
        })
      )
      .subscribe(user => {
        this.user.set(user);
      });
  }

  private loadAppointments() {
    this.http.get<Appointment[]>('/api/patient/appointments')
      .pipe(
        tap(() => this.recalcStats()),
        catchError(err => {
          console.error('Failed to load appointments', err);
          return of([]);
        })
      )
      .subscribe(appts => {
        this.appointments.set(appts);
        this.isLoading.set(false);
      });
  }

  private loadMedicalHistory() {
    this.http.get<MedicalRecord[]>('/api/patient/records')
      .pipe(
        tap(() => this.recalcStats()),
        catchError(err => {
          console.error('Failed to load medical history', err);
          return of([]);
        })
      )
      .subscribe(records => {
        this.medicalHistory.set(records);
      });
  }

  private loadPrescriptions() {
    this.http.get<Prescription[]>('/api/patient/prescriptions')
      .pipe(
        tap(() => this.recalcStats()),
        catchError(err => {
          console.error('Failed to load prescriptions', err);
          return of([]);
        })
      )
      .subscribe(meds => {
        this.prescriptions.set(meds);
      });
  }

  private loadTestResults() {
    this.http.get<TestResult[]>('/api/patient/tests')
      .pipe(
        tap(() => this.recalcStats()),
        catchError(err => {
          console.error('Failed to load test results', err);
          return of([]);
        })
      )
      .subscribe(tests => {
        this.testResults.set(tests);
      });
  }

  private recalcStats() {
    const appts = this.appointments();
    const activeMeds = this.prescriptions().filter(p => p.status === 'active').length;
    this.stats.set({
      upcomingAppointments: appts.filter(a => ['confirmed', 'pending'].includes(a.status)).length,
      activeMeds,
      records: this.medicalHistory().length,
      testResults: this.testResults().length
    });
  }

  bookAppointment() {
    this.router.navigate(['/patient/appointments/new']);
  }

  requestRefill(p: Prescription) {
    this.http.post('/api/patient/prescriptions/refill', { id: p.id })
      .subscribe({
        next: () => alert(`Refill requested for ${p.medication}`),
        error: (err) => console.error('Refill failed', err)
      });
  }

  viewTestDetails(t: TestResult) {
    this.router.navigate(['/patient/tests', t.id]);
  }

  callEmergency() {
    window.open('tel:911', '_self');
  }

  getInitials(first?: string, last?: string): string {
    return first && last ? `${first[0]}${last[0]}`.toUpperCase() : 'P';
  }

  setTab(tab: 'appointments' | 'history' | 'prescriptions' | 'tests') {
    this.activeTab.set(tab);
  }
}