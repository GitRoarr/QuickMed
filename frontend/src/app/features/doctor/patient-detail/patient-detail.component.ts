import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DoctorService } from '@core/services/doctor.service';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  template: `
    <div class="patient-detail" *ngIf="!isLoading(); else loadingTpl">
      <button class="back-btn" (click)="navigate('/doctor/patients')">
        <i class="bi bi-arrow-left"></i> Back to Patients
      </button>

      <section *ngIf="patient(); else notFoundTpl">
        <header class="header">
          <div class="avatar">
            <img *ngIf="patient()?.avatar; else initialsTpl" [src]="patient()?.avatar" alt="Avatar" />
            <ng-template #initialsTpl>
              <div class="initials">{{ getInitials() }}</div>
            </ng-template>
          </div>
          <div>
            <h1>{{ patient()?.firstName }} {{ patient()?.lastName }}</h1>
            <p class="muted">ID: {{ patient()?.patientId || patient()?.id }}</p>
            <p class="muted">{{ patient()?.email }} · {{ patient()?.phoneNumber }}</p>
          </div>
        </header>

        <div class="stats">
          <div class="stat">
            <span class="label">Total Visits</span>
            <span class="value">{{ patient()?.totalAppointments || 0 }}</span>
          </div>
          <div class="stat">
            <span class="label">Last Status</span>
            <span class="value">{{ patient()?.lastStatus || '—' }}</span>
          </div>
          <div class="stat">
            <span class="label">Last Seen</span>
            <span class="value">{{ formatLastSeen() }}</span>
          </div>
        </div>

        <section class="actions">
          <button class="btn btn-primary" (click)="navigate('/doctor/messages')">
            <i class="bi bi-chat-dots"></i> Message
          </button>
          <button class="btn btn-outline-primary" (click)="navigate('/doctor/records')">
            <i class="bi bi-file-earmark-medical"></i> View Records
          </button>
          <button class="btn btn-success" (click)="navigate('/doctor/appointments')">
            <i class="bi bi-plus-circle"></i> New Appointment
          </button>
        </section>

        <section class="panel" *ngIf="appointments()?.length">
          <h3>Recent Appointments</h3>
          <div class="list">
            <div class="row" *ngFor="let a of appointments()">
              <div>
                <span class="eyebrow">{{ a.type }}</span>
                <div>{{ a.reason || '—' }}</div>
              </div>
              <div>
                <span>{{ a.appointmentDate | date:'mediumDate' }}</span>
                <span class="muted">{{ a.appointmentTime }}</span>
              </div>
              <div class="status" [class.pending]="a.status==='pending'" [class.completed]="a.status==='completed'" [class.cancelled]="a.status==='cancelled'">
                {{ a.status | titlecase }}
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>

    <ng-template #loadingTpl>
      <div class="loading">Loading patient details...</div>
    </ng-template>

    <ng-template #notFoundTpl>
      <div class="empty">Patient not found.</div>
    </ng-template>
  `,
  styles: [
    `
    .patient-detail { padding: 1.25rem; }
    .back-btn { background: transparent; border: none; color: var(--primary-color); margin-bottom: .75rem; cursor: pointer; }
    .header { display:flex; gap:1rem; align-items:center; padding:1rem; background: var(--surface); border:1px solid var(--border-color); border-radius: 12px; }
    .avatar { width:64px; height:64px; border-radius:50%; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#e5e7eb; }
    .initials { font-weight:700; }
    .muted { color: var(--text-muted); }
    .stats { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:.75rem; margin:1rem 0; }
    .stat { background: var(--surface); border:1px solid var(--border-color); border-radius: 10px; padding:.75rem; }
    .label { color: var(--text-muted); font-size:.85rem; }
    .value { font-weight:600; }
    .actions { display:flex; gap:.5rem; margin:1rem 0; }
    .panel { background: var(--surface); border:1px solid var(--border-color); border-radius: 12px; padding:1rem; }
    .list { display:flex; flex-direction:column; gap:.6rem; }
    .row { display:grid; grid-template-columns: 2fr 1fr auto; gap:.75rem; align-items:center; padding:.6rem .4rem; border-bottom:1px dashed var(--border-color); }
    .eyebrow { text-transform:uppercase; font-size:.75rem; color: var(--text-muted); }
    .status { font-weight:600; }
    .status.pending { color:#f59e0b; }
    .status.completed { color:#16a34a; }
    .status.cancelled { color:#ef4444; }
    .loading, .empty { padding: 2rem; text-align:center; color: var(--text-muted); }
    `
  ]
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
