import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
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
  imports: [CommonModule, FormsModule, DatePipe, CurrencyPipe, HeaderComponent, SidebarComponent],
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

  statusFilter = signal<string>('pending');
  dateFilter = signal<string>('');
  searchQuery = signal<string>('');
  payments = signal<any[]>([]);
  doctorServices = signal<{ [key: string]: any[] }>({});
  selectedService = signal<{ [key: string]: string }>({});
  loading = signal(false);
  feedback = signal<{ type: 'success' | 'error', message: string } | null>(null);
  processingId = signal<string | null>(null);

  // Stats from backend
  stats = signal<any>(null);
  loadingStats = signal(false);

  filteredPayments = computed(() => this.payments());

  ngOnInit(): void {
    this.loadPayments();
    this.loadStats();
  }

  loadStats(): void {
    this.loadingStats.set(true);
    this.receptionistService.getPaymentStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loadingStats.set(false);
      },
      error: () => this.loadingStats.set(false),
    });
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
        // Pre-fetch services for all doctors in the list
        const doctorIds = [...new Set(list.map(p => p.doctorId))];
        doctorIds.forEach(id => {
          if (id && !this.doctorServices()[id]) {
            this.fetchServices(id);
          }
        });
      },
      error: () => this.loading.set(false),
    });
  }

  fetchServices(doctorId: string): void {
    this.receptionistService.getDoctorServices(doctorId).subscribe({
      next: (services) => {
        this.doctorServices.update(prev => ({ ...prev, [doctorId]: services }));
      }
    });
  }

  onServiceChange(rowId: string, serviceId: string): void {
    this.selectedService.update(prev => ({ ...prev, [rowId]: serviceId }));
  }

  markCashPaid(row: any): void {
    if (!row?.id) return;

    const serviceId = this.selectedService()[row.id];
    let amount = row.paymentAmount;

    if (serviceId) {
      const services = this.doctorServices()[row.doctorId];
      const service = services?.find(s => s.id === serviceId);
      if (service) amount = service.price;
    }

    this.processingId.set(row.id);
    this.paymentService.createCashPayment({
      appointmentId: row.id,
      amount: amount || undefined,
      serviceId: serviceId || undefined
    }).subscribe({
      next: () => {
        this.feedback.set({ type: 'success', message: `Payment recorded for ${row.patient?.firstName || ''} ${row.patient?.lastName || ''}` });
        this.loadPayments();
        this.loadStats();
        this.processingId.set(null);
        setTimeout(() => this.feedback.set(null), 4000);
      },
      error: (err) => {
        this.feedback.set({ type: 'error', message: err.error?.message || 'Failed to record payment' });
        this.processingId.set(null);
        setTimeout(() => this.feedback.set(null), 5000);
      },
    });
  }

  getPaymentDisplay(row: any): string {
    const sId = this.selectedService()[row.id];
    if (sId) {
      const services = this.doctorServices()[row.doctorId];
      const service = services?.find(s => s.id === sId);
      if (service) return `$${Number(service.price).toFixed(2)}`;
    }

    if (row.paymentAmount) {
      return `$${Number(row.paymentAmount).toFixed(2)}`;
    }
    return '$50.00';
  }

  getMethodLabel(method: string | null): string {
    if (!method) return '—';
    switch (method) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'stripe': return 'Stripe';
      default: return method;
    }
  }

  setStatus(status: string): void {
    this.statusFilter.set(status);
    this.loadPayments();
  }

  onDateChange(date: string): void {
    this.dateFilter.set(date);
    this.loadPayments();
  }

  clearDateFilter(): void {
    this.dateFilter.set('');
    this.loadPayments();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.loadPayments();
  }

  refreshAll(): void {
    this.loadPayments();
    this.loadStats();
  }
}
