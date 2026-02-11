import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DoctorService, DoctorPatientDetail } from '@core/services/doctor.service';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { MessageService } from '@core/services/message.service';
import { ToastService } from '@core/services/toast.service';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
} from '@angular/animations';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DoctorHeaderComponent],
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.css'],
  animations: [
    trigger('listAnimation', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(-15px)' }),
            stagger(
              '50ms',
              animate(
                '300ms ease-out',
                style({ opacity: 1, transform: 'translateY(0)' })
              )
            ),
          ],
          { optional: true }
        ),
      ]),
    ]),
     trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class PatientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private doctorService = inject(DoctorService);
  private messagesService = inject(MessageService);
  private toastService = inject(ToastService);

  isLoading = signal(true);
  detail = signal<DoctorPatientDetail | null>(null);
  activeTab = signal<'appointments' | 'records' | 'prescriptions'>('appointments');
  
  patient = computed(() => this.detail()?.patient);
  stats = computed(() => this.detail()?.stats);
  appointments = computed(() => this.detail()?.appointments || []);
  medicalRecords = computed(() => this.detail()?.medicalRecords || []);
  prescriptions = computed(() => this.detail()?.prescriptions || []);

  profileModalOpen = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      return;
    }

    this.doctorService.getPatientDetail(id).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load patient detail', err);
        this.toastService.error('Failed to load patient details');
        this.detail.set(null);
        this.isLoading.set(false);
      },
    });
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  setActiveTab(tab: 'appointments' | 'records' | 'prescriptions') {
    this.activeTab.set(tab);
  }

  openProfileModal(): void {
    this.profileModalOpen.set(true);
  }

  closeProfileModal(): void {
    this.profileModalOpen.set(false);
  }

  getInitials(): string {
    const p = this.patient();
    if (!p) return 'P';
    const first = p.firstName?.charAt(0) || '';
    const last = p.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  }

  formatLastSeen(): string {
    const lastSeen = this.patient()?.lastSeen;
    if (!lastSeen) return 'Never';
    
    const d = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }
  
  getFullName(): string {
    const p = this.patient();
    return p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : 'Patient';
  }

  getAge(): string {
    const dob = this.patient()?.dateOfBirth;
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years`;
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'confirmed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getRecordTypeColor(type: string): string {
    switch (type?.toLowerCase()) {
      case 'lab': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'prescription': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'imaging': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'diagnosis': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getPrescriptionStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  messagePatient() {
    const patientId = this.patient()?.id;
    if (!patientId) return;

    this.messagesService.createConversation(patientId).subscribe({
      next: (conversation) => {
        this.closeProfileModal();
        this.router.navigate(['/doctor/messages'], { queryParams: { conversationId: conversation.id } });
      },
      error: () => {
        this.toastService.error('Failed to start conversation');
      }
    });
  }

  startConsultation(appointmentId: string) {
    this.router.navigate(['/consultation/form', appointmentId]);
  }

  viewConsultation(appointmentId: string) {
    this.router.navigate(['/consultation/view', appointmentId]);
  }
}
