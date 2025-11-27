import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { AppointmentService } from '@app/core/services/appointment.service';

@Component({
  selector: 'app-receptionist-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private readonly receptionistService = inject(ReceptionistService);
  private readonly destroyRef = inject(DestroyRef);

  todayAppointments = signal<any[]>([]);
  pendingPayments = signal<any[]>([]);
  waiting = signal<any[]>([]);
  isLoading = signal(false);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.receptionistService.getDashboard().subscribe({
      next: (res) => {
        this.todayAppointments.set(res.todayAppointments || []);
        this.pendingPayments.set(res.pendingPayments || []);
        this.waiting.set(res.waiting || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load receptionist dashboard', err);
        this.isLoading.set(false);
      },
    });
  }
}
