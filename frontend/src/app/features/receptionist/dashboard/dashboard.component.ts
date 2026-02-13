import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { ThemeService } from '@core/services/theme.service';
import { AuthService } from '@core/services/auth.service';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-receptionist-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private readonly receptionistService = inject(ReceptionistService);
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  private readonly router = inject(Router);

  menuItems = [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/receptionist/dashboard', exact: true },
    { label: 'Appointments', icon: 'bi-calendar-check', route: '/receptionist/appointments' },
    { label: 'Patients', icon: 'bi-people', route: '/receptionist/patients' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/receptionist/messages' },
    { label: 'Payments', icon: 'bi-cash-stack', route: '/receptionist/payments' },
    { label: 'Doctors',
      iconImgLight: 'https://img.icons8.com/?size=100&id=60999&format=png&color=000000',
      iconImgDark: 'https://img.icons8.com/?size=100&id=60999&format=png&color=4e91fd',
      route: '/receptionist/doctors' },
    { label: 'Reports', icon: 'bi-bar-chart', route: '/receptionist/reports' },
  ];

  secondaryItems = [
    { label: 'Settings', icon: 'bi-gear', route: '/receptionist/settings' },
    { label: 'Logout', icon: 'bi-box-arrow-right', route: '/receptionist/logout' },
  ];

  todayAppointments = signal<any[]>([]);
  pendingPayments = signal<any[]>([]);
  waiting = signal<any[]>([]);
  stats = signal<{
    totalToday: number;
    waitingRoom: number;
    paymentsDue: number;
    videoVisits: number;
    checkedIn?: number;
    messages?: number;
  }>({
    totalToday: 0,
    waitingRoom: 0,
    paymentsDue: 0,
    videoVisits: 0,
  });
  unreadMessages = signal(0);
  checkedIn = signal(0);
  appointmentsTable = signal<any[]>([]);
  timeline = signal<any[]>([]);
  recentPatients = signal<any[]>([]);
  tasks = signal<{ id: string; title: string; status: string }[]>([]);
  searchQuery = signal('');
  isLoading = signal(false);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.receptionistService.getDashboard(undefined, undefined, this.searchQuery()).subscribe({
      next: (res) => {
        this.todayAppointments.set(res.todayAppointments || []);
        this.pendingPayments.set(res.pendingPayments || []);
        this.waiting.set(res.waiting || []);
        if (res.stats) this.stats.set(res.stats);
        this.unreadMessages.set(res.stats?.messages ?? 0);
        this.checkedIn.set(res.stats?.checkedIn ?? 0);
        this.timeline.set(res.timeline || []);
        this.recentPatients.set(res.recentPatients || []);
        this.tasks.set(res.tasks || []);
        this.appointmentsTable.set(res.appointmentsTable || res.todayAppointments || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load receptionist dashboard', err);
        this.isLoading.set(false);
      },
    });
  }

  getStatusLabel(row: any): string {
    if (row?.arrived && row?.status === 'waiting') return 'Waiting Room';
    if (row?.status === 'in-progress') return 'In Session';
    if (!row?.status) return 'Scheduled';

    return row.status.split('_').map((word: string) =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  getStatusClass(row: any): string {
    const status = (row?.status || '').toLowerCase();
    if (status === 'completed') return 'status completed';
    if (status === 'cancelled') return 'status cancelled';
    if (status === 'overdue' || status === 'missed') return 'status overdue';
    if (status === 'in-progress') return 'status in-session';
    if (row?.arrived || status === 'waiting') return 'status waiting';
    if (status === 'no_show') return 'status no-show';
    return 'status pending';
  }

  canCheckIn(row: any): boolean {
    const status = (row?.status || '').toLowerCase();
    return !row.arrived && !['completed', 'cancelled', 'missed', 'expired'].includes(status);
  }

  canModify(row: any): boolean {
    const status = (row?.status || '').toLowerCase();
    return !['completed', 'cancelled'].includes(status);
  }

  markCheckedIn(id: string): void {
    this.receptionistService.markArrived(id).subscribe({
      next: () => this.loadDashboard(),
      error: (err) => console.error('Failed to mark arrived', err),
    });
  }

  updateStatus(id: string, status: string): void {
    this.receptionistService.updateAppointment(id, { status }).subscribe({
      next: () => this.loadDashboard(),
      error: (err) => console.error('Failed to update appointment', err),
    });
  }

  onSearch(): void {
    this.loadDashboard();
  }

  goToRegisterPatient(): void {
    this.router.navigate(['/receptionist/patients']);
  }

  goToBookAppointment(): void {
    this.router.navigate(['/receptionist/appointments']);
  }

  goToMessages(): void {
    this.router.navigate(['/messages']);
  }
}
