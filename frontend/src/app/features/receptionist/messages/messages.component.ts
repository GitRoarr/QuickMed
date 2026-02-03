import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { DoctorService, DoctorListItem } from '@app/core/services/doctor.service';
import { AuthService } from '@core/services/auth.service';

interface MessageThread {
  receiverId: string;
  receiverRole: 'patient' | 'doctor';
  receiverName: string;
  receiverAvatar?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
}

@Component({
  selector: 'app-receptionist-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SidebarComponent],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css'],
})
export class ReceptionistMessagesComponent implements OnInit {
  private readonly receptionistService = inject(ReceptionistService);
  private readonly doctorService = inject(DoctorService);
  authService = inject(AuthService);

  menuItems = [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/receptionist/dashboard', exact: true },
    { label: 'Appointments', icon: 'bi-calendar-check', route: '/receptionist/appointments' },
    { label: 'Patients', icon: 'bi-people', route: '/receptionist/patients' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/receptionist/messages' },
    { label: 'Payments', icon: 'bi-cash-stack', route: '/receptionist/payments' },
    { label: 'Doctors', icon: 'bi-stethoscope', route: '/receptionist/doctors' },
    { label: 'Reports', icon: 'bi-bar-chart', route: '/receptionist/reports' },
  ];

  secondaryItems = [
    { label: 'Settings', icon: 'bi-gear', route: '/receptionist/settings' },
    { label: 'Logout', icon: 'bi-box-arrow-right', action: () => this.authService.logout() },
  ];

  threads = signal<MessageThread[]>([]);
  patients = signal<any[]>([]);
  doctors = signal<DoctorListItem[]>([]);
  selectedReceiverId = signal<string>('');
  selectedReceiverRole = signal<'patient' | 'doctor'>('patient');
  messages = signal<any[]>([]);
  draft = signal('');
  search = signal('');
  loading = signal(false);

  filteredThreads = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.threads();
    return this.threads().filter((t) => t.receiverName?.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.loadRecipients();
    this.loadThreads();
  }

  private loadRecipients(): void {
    this.receptionistService.listPatients().subscribe({
      next: (list) => this.patients.set(list || []),
      error: () => this.patients.set([]),
    });

    this.doctorService.listDoctors().subscribe({
      next: (list) => this.doctors.set(list || []),
      error: () => this.doctors.set([]),
    });
  }

  loadThreads(): void {
    this.loading.set(true);
    this.receptionistService.listMessageThreads().subscribe({
      next: (list) => {
        this.threads.set(list || []);
        if (!this.selectedReceiverId() && list?.length) {
          this.selectThread(list[0]);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectThread(thread: MessageThread): void {
    this.selectedReceiverId.set(thread.receiverId);
    this.selectedReceiverRole.set(thread.receiverRole);
    this.loadMessages();
  }

  loadMessages(): void {
    const receiverId = this.selectedReceiverId();
    if (!receiverId) return;
    this.receptionistService.getMessageThread(receiverId).subscribe({
      next: (list) => this.messages.set(list || []),
      error: () => this.messages.set([]),
    });
  }

  send(): void {
    const receiverId = this.selectedReceiverId();
    const content = this.draft().trim();
    if (!receiverId || !content) return;

    this.receptionistService.sendMessage({
      receiverId,
      receiverRole: this.selectedReceiverRole(),
      content,
    }).subscribe({
      next: () => {
        this.draft.set('');
        this.loadThreads();
        this.loadMessages();
      },
    });
  }

  startNewMessage(role: 'patient' | 'doctor', id: string): void {
    this.selectedReceiverRole.set(role);
    this.selectedReceiverId.set(id);
    this.loadMessages();
  }
}
