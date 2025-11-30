import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AppointmentService } from '@core/services/appointment.service';
import { Appointment } from '@core/models/appointment.model';
import { AuthService } from '@core/services/auth.service';
import { BadgeService } from '@core/services/badge.service';
import { MessageService } from '@core/services/message.service';

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
  isLoading = signal(true);
  selectedDate = signal(new Date());
  currentMonth = signal(new Date());
  currentUser = signal<any>(null);

  menuItems = signal<MenuItem[]>([]);
  private badgeService = inject(BadgeService);
  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);

  timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  constructor(
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadAppointments();
    this.loadBadgeCounts();
  }

  loadBadgeCounts(): void {
    this.appointmentService.getPendingCount().subscribe({
      next: (data) => {
        this.updateMenuItems(data.count || 0, this.badgeService.messageCount());
      }
    });

    this.messageService.getUnreadCount().subscribe({
      next: (data) => {
        this.updateMenuItems(this.badgeService.appointmentCount(), data.count || 0);
      }
    });
  }

  updateMenuItems(appointmentCount: number, messageCount: number): void {
    this.menuItems.set([
      { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
      { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: appointmentCount > 0 ? appointmentCount : undefined },
      { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
      { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
      { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/doctor/records' },
      { label: 'Prescriptions', icon: 'bi-prescription2', route: '/doctor/prescriptions' },
      { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: messageCount > 0 ? messageCount : undefined },
      { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
      { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
    ]);
  }

  loadUserData(): void {
    const user = this.authService.currentUser();
    this.currentUser.set(user);
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.appointmentService.getMyAppointments().subscribe({
      next: (data) => {
        this.appointments.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  getDoctorName(): string {
    const user = this.currentUser();
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Doctor';
  }

  getDoctorSpecialty(): string {
    const user = this.currentUser();
    return user?.specialty || 'General Practitioner';
  }

  getDoctorInitials(): string {
    const name = this.getDoctorName();
    if (!name) return 'DR';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getSelectedDateAppointments(): Appointment[] {
    const selected = this.selectedDate();
    const dateStr = selected.toISOString().split('T')[0];
    return this.appointments().filter(apt => apt.appointmentDate === dateStr);
  }

  getAppointmentForSlot(slot: string): Appointment | null {
    const selected = this.selectedDate();
    const dateStr = selected.toISOString().split('T')[0];
    return this.appointments().find(apt => 
      apt.appointmentDate === dateStr && 
      apt.appointmentTime.startsWith(slot)
    ) || null;
  }

  getCalendarDays(): Date[] {
    const month = this.currentMonth();
    const year = month.getFullYear();
    const firstDay = new Date(year, month.getMonth(), 1);
    const lastDay = new Date(year, month.getMonth() + 1, 0);
    const days: Date[] = [];
    
    // Add days from previous month
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(firstDay);
      date.setDate(date.getDate() - i - 1);
      days.push(date);
    }
    
    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month.getMonth(), i));
    }
    
    // Add days from next month to fill the grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(lastDay);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    
    return days;
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isSelected(date: Date): boolean {
    const selected = this.selectedDate();
    return date.toDateString() === selected.toDateString();
  }

  isCurrentMonth(date: Date): boolean {
    const month = this.currentMonth();
    return date.getMonth() === month.getMonth() && 
           date.getFullYear() === month.getFullYear();
  }

  selectDate(date: Date): void {
    this.selectedDate.set(date);
  }

  previousMonth(): void {
    const month = this.currentMonth();
    month.setMonth(month.getMonth() - 1);
    this.currentMonth.set(new Date(month));
  }

  nextMonth(): void {
    const month = this.currentMonth();
    month.setMonth(month.getMonth() + 1);
    this.currentMonth.set(new Date(month));
  }

  getMonthYear(): string {
    const month = this.currentMonth();
    return month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
