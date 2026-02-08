import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DoctorService, DoctorPatientDetail } from '@core/services/doctor.service';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { MessageService } from '@core/services/message.service';
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

  isLoading = signal(true);
  detail = signal<DoctorPatientDetail | null>(null);
  
  patient = computed(() => this.detail()?.patient);
  stats = computed(() => this.detail()?.stats);
  appointments = computed(() => this.detail()?.appointments);

  profileModalOpen = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      // Consider navigating away or showing a more specific error
      return;
    }

    this.doctorService.getPatientDetail(id).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load patient detail', err);
        this.detail.set(null);
        this.isLoading.set(false);
      },
    });
  }

  navigate(route: string) {
    this.router.navigate([route]);
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
    if (!lastSeen) return '—';
    
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

  messagePatient() {
    const patientId = this.patient()?.id;
    if (!patientId) return;

    this.messagesService.createConversation(patientId).subscribe(conversation => {
      this.closeProfileModal();
      this.router.navigate(['/doctor/messages'], { queryParams: { conversationId: conversation.id } });
    });
  }
}
