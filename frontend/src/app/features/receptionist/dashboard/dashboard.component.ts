import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';

@Component({
  selector: 'app-receptionist-dashboard',
  standalone: true,
  imports: [CommonModule, HeaderComponent, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  private readonly receptionistService = inject(ReceptionistService);

  todayAppointments = signal<any[]>([]);
  pendingPayments = signal<any[]>([]);
  waiting = signal<any[]>([]);
  stats = signal<{ totalToday: number; waitingRoom: number; paymentsDue: number; videoVisits: number }>({
    totalToday: 0,
    waitingRoom: 0,
    paymentsDue: 0,
    videoVisits: 0,
  });
  timeline = signal<any[]>([]);
  recentPatients = signal<any[]>([]);
  tasks = signal<{ id: string; title: string; status: string }[]>([]);
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
        if (res.stats) this.stats.set(res.stats);
        this.timeline.set(res.timeline || []);
        this.recentPatients.set(res.recentPatients || []);
        this.tasks.set(res.tasks || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load receptionist dashboard', err);
        this.isLoading.set(false);
      },
    });
  }
}
