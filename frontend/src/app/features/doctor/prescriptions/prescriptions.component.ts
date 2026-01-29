import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { ThemeService } from '@core/services/theme.service';
import { AuthService } from '@core/services/auth.service';
import { PrescriptionService, Prescription } from '@core/services/prescription.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-doctor-prescriptions',
  standalone: true,
  imports: [CommonModule, DatePipe, DoctorHeaderComponent],
  templateUrl: './prescriptions.component.html',
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('700ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class PrescriptionsComponent implements OnInit {

  themeService = inject(ThemeService);
  private auth = inject(AuthService);
  private service = inject(PrescriptionService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  prescriptions = signal<Prescription[]>([]);
  filteredPrescriptions = signal<Prescription[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  currentUser = signal<any>(null);
  unreadNotificationCount = signal(0);

  skeletons = Array(6);

  ngOnInit(): void {
    this.currentUser.set(this.auth.currentUser());
    this.load();
    this.notify.getUnreadCount().subscribe(c => this.unreadNotificationCount.set(c || 0));
  }

  load(): void {
    this.isLoading.set(true);
    this.service.getAll(this.searchQuery() || undefined).subscribe({
      next: d => {
        this.prescriptions.set(d);
        this.filteredPrescriptions.set(d);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSearchChange(): void {
    this.load();
  }

  getPatientName(p: Prescription): string {
    return p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : 'Unknown';
  }

  getDoctorInitials(): string {
    const u = this.currentUser();
    return u ? (u.firstName[0] + u.lastName[0]).toUpperCase() : 'DR';
  }

  createNewPrescription(): void {
    this.router.navigate(['/doctor/prescriptions/create']);
  }


}
