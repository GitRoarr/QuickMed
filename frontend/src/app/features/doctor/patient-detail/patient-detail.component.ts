import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DoctorService } from '@core/services/doctor.service';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.css']
})
export class PatientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private doctorService = inject(DoctorService);

  isLoading = signal(true);
  patient = signal<any | null>(null);
  appointments = signal<any[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      return;
    }

    this.doctorService.getPatientDetail(id).subscribe({
      next: (detail) => {
        this.patient.set(detail?.patient || detail || null);
        this.appointments.set(detail?.appointments || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load patient detail', err);
        this.patient.set(null);
        this.appointments.set([]);
        this.isLoading.set(false);
      }
    });
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  getInitials(): string {
    const p = this.patient();
    const first = (p?.firstName || 'P').charAt(0);
    const last = (p?.lastName || '').charAt(0);
    return `${first}${last}`.toUpperCase();
  }

  formatLastSeen(): string {
    const p = this.patient();
    const dateStr = p?.lastAppointmentDate;
    const timeStr = p?.lastAppointmentTime;
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      if (!Number.isNaN(h) && !Number.isNaN(m)) d.setHours(h, m, 0, 0);
    }
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }
}
