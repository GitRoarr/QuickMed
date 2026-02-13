import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { PaymentService } from '@app/core/services/payment.service';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-receptionist-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, HeaderComponent, SidebarComponent],
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.css'],
})
export class ReceptionistPaymentsComponent implements OnInit {
  private readonly receptionistService = inject(ReceptionistService);
  private readonly paymentService = inject(PaymentService);
  authService = inject(AuthService);
  themeService = inject(ThemeService);

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
    { label: 'Logout', icon: 'bi-box-arrow-right', route: '/receptionist/logout' },
  ];

  statusFilter = signal<string>('not_paid');
  dateFilter = signal<string>('');
  searchQuery = signal<string>('');
  payments = signal<any[]>([]);
  loading = signal(false);
  feedback = signal<{ type: 'success' | 'error', message: string } | null>(null);

  filteredPayments = computed(() => this.payments());

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.loading.set(true);
    this.receptionistService.listPayments({
      status: this.statusFilter() || undefined,
      date: this.dateFilter() || undefined,
      search: this.searchQuery() || undefined,
    }).subscribe({
      next: (list) => {
        this.payments.set(list || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.loadPayments();
  }

  markCashPaid(row: any): void {
    if (!row?.id) return;
    this.loading.set(true);
    this.paymentService.createCashPayment({ appointmentId: row.id }).subscribe({
      next: () => {
        this.feedback.set({ type: 'success', message: 'Payment recorded successfully' });
        this.loadPayments();
        setTimeout(() => this.feedback.set(null), 3000);
      },
      error: (err) => {
        this.feedback.set({ type: 'error', message: err.error?.message || 'Failed to record payment' });
        this.loading.set(false);
        setTimeout(() => this.feedback.set(null), 5000);
      },
    });
  }
}
