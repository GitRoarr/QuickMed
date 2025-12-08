import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AppointmentService } from '@core/services/appointment.service';
import { Appointment } from '@core/models/appointment.model';
import { AuthService } from '@core/services/auth.service';
import { BadgeService } from '@core/services/badge.service';
import { MessageService } from '@core/services/message.service';
import { forkJoin } from 'rxjs';
import { SchedulingService, DoctorSlot } from '../../../core/services/schedule.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-doctor-schedule',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css']
})
export class ScheduleComponent implements OnInit {
  appointments = signal<Appointment[]>([]);
  slots = signal<any[]>([]);
  isLoading = signal(true);
  selectedDate = signal(new Date());
  currentMonth = signal(new Date());
  currentUser = signal<any>(null);
  menuItems = signal<MenuItem[]>([]);

  private badgeService = inject(BadgeService);
  private scheduleService = inject(SchedulingService);
  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  getTimeSlots(): string[] {
    return (this.slots() || [])
      .map((s: any) => s.time)
      .filter((t: string) => !!t)
      .sort();
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadAppointments();
    this.loadBadgeCounts();
    this.loadSlots();
  }

  loadSlots(): void {
    const dateStr = this.selectedDate().toISOString().split('T')[0];
    this.scheduleService.getDaySchedule(dateStr).subscribe({
      next: (res: any[]) => this.slots.set(res),
      error: () => this.slots.set([])
    });
  }

  setAvailable(time: string): void {
    const dateStr = this.selectedDate().toISOString().split('T')[0];
    this.scheduleService.setAvailable(dateStr, time).subscribe(() => this.loadSlots());
  }

  blockSlot(time: string): void {
    const dateStr = this.selectedDate().toISOString().split('T')[0];
    this.scheduleService.blockSlot(dateStr, time).subscribe(() => this.loadSlots());
  }

  getSlotStatus(time: string): string {
    const found = this.slots().find(s => s.time === time);
    return found ? found.status : 'available';
  }

  getAppointmentForSlot(slot: string): Appointment | null {
    const dateStr = this.selectedDate().toISOString().split('T')[0];
    return this.appointments().find(
      apt => apt.appointmentDate === dateStr && apt.appointmentTime.startsWith(slot)
    ) || null;
  }

  loadBadgeCounts(): void {
    forkJoin({
      appointments: this.appointmentService.getPendingCount(),
      messages: this.messageService.getUnreadCount()
    }).subscribe(({ appointments, messages }) => {
      this.updateMenuItems(appointments.count || 0, messages.count || 0);
    });
  }

  updateMenuItems(appointmentCount: number, messageCount: number): void {
    this.menuItems.set([
      { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
      { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: appointmentCount || undefined },
      { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
      { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
      { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/doctor/records' },
      { label: 'Prescriptions', icon: 'bi-prescription2', route: '/doctor/prescriptions' },
      { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: messageCount || undefined },
      { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
      { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
    ]);
  }

  loadUserData(): void {
    this.currentUser.set(this.authService.currentUser());
  }

  getDoctorName(): string {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Doctor';
  }

  getDoctorSpecialty(): string {
    const user = this.currentUser();
    return user?.specialty || 'General Practitioner';
  }

  getDoctorInitials(): string {
    const name = this.getDoctorName();
    const parts = name.split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  // ==================== APPOINTMENTS ====================
  loadAppointments(): void {
    this.isLoading.set(true);
    this.appointmentService.getMyAppointments().subscribe({
      next: (data) => {
        this.appointments.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getSelectedDateAppointments(): Appointment[] {
    const selected = this.selectedDate();
    const dateStr = selected.toISOString().split('T')[0];
    return this.appointments().filter(apt => apt.appointmentDate === dateStr);
  }

  // ==================== CALENDAR ====================
  getCalendarDays(): Date[] {
    const month = this.currentMonth();
    const year = month.getFullYear();
    const firstDay = new Date(year, month.getMonth(), 1);
    const lastDay = new Date(year, month.getMonth() + 1, 0);
    const days: Date[] = [];

    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(firstDay);
      date.setDate(date.getDate() - (i + 1));
      days.push(date);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month.getMonth(), i));
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(lastDay);
      date.setDate(date.getDate() + i);
      days.push(date);
    }

    return days;
  }

  isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
  }

  isSelected(date: Date): boolean {
    return date.toDateString() === this.selectedDate().toDateString();
  }

  isCurrentMonth(date: Date): boolean {
    const month = this.currentMonth();
    return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
  }

  selectDate(date: Date): void {
    this.selectedDate.set(date);
    this.loadSlots();
  }

  previousMonth(): void {
    const month = new Date(this.currentMonth());
    month.setMonth(month.getMonth() - 1);
    this.currentMonth.set(month);
  }

  nextMonth(): void {
    const month = new Date(this.currentMonth());
    month.setMonth(month.getMonth() + 1);
    this.currentMonth.set(month);
  }

  getMonthYear(): string {
    return this.currentMonth().toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
