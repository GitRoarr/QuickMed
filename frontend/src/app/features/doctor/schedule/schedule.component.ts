import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '@core/services/appointment.service';
import { Appointment, AppointmentStatus } from '@core/models/appointment.model';
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
  imports: [CommonModule, DatePipe, RouterModule, FormsModule],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css']
})
export class ScheduleComponent implements OnInit {
  appointments = signal<Appointment[]>([]);
  slots = signal<DoctorSlot[]>([]);
  isLoading = signal(true);
  selectedDate = signal(new Date());
  currentMonth = signal(new Date());
  currentUser = signal<any>(null);
  menuItems = signal<MenuItem[]>([]);

  viewMode = signal<'day' | 'week' | 'month'>('day');
  slotDurationMinutes = signal(30);
  workingStart = signal('09:00');
  workingEnd = signal('17:00');
  breakStart = signal('12:00');
  breakEnd = signal('13:00');
  workingDays = signal<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  showAvailabilityEditor = signal(false);
  showLegend = signal(true);

  today = new Date();

  private badgeService = inject(BadgeService);
  private scheduleService = inject(SchedulingService);
  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Availability form state
  availabilityMode = signal<'single' | 'range'>('single');
  singleTime = signal('08:00');
  rangeStart = signal('08:00');
  rangeEnd = signal('09:00');

  weekDays = computed(() => {
    const start = this.getWeekStart(this.selectedDate());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  });

  daySlots = computed(() => this.buildDaySlots(this.selectedDate()));
  nextAppointment = computed(() => this.getNextAppointment());

  getSlots(): DoctorSlot[] {
    return [...(this.slots() || [])]
      .map((s) => ({
        ...s,
        startTime: s.startTime || s.time || '',
        endTime: s.endTime || s.startTime || s.time || '',
      }))
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadAppointments();
    this.loadBadgeCounts();
    this.loadSlots();
  }

  // ==================== Availability ====================
  toggleWorkingDay(day: number): void {
    const set = new Set(this.workingDays());
    set.has(day) ? set.delete(day) : set.add(day);
    const updated = Array.from(set).sort();
    this.workingDays.set(updated);
    this.scheduleService.updateWorkingDays(updated).subscribe();
  }

  saveAvailability(): void {
    // Persist current day's availability to backend
    const dateStr = this.toDateOnly(this.selectedDate());
    this.scheduleService.setAvailable(dateStr, this.workingStart(), this.workingEnd()).subscribe({
      next: () => this.loadSlots(),
      error: () => this.loadSlots(),
    });
  }

  setAvailability(): void {
    const dateStr = this.selectedDate().toISOString().split('T')[0];
    if (this.availabilityMode() === 'single') {
      const time = this.singleTime();
      this.scheduleService.setAvailable(dateStr, time).subscribe({
        next: () => this.loadSlots(),
        error: () => this.loadSlots(),
      });
    } else {
      const start = this.rangeStart();
      const end = this.rangeEnd();
      this.scheduleService.setAvailable(dateStr, start, end).subscribe({
        next: () => this.loadSlots(),
        error: () => this.loadSlots(),
      });
    }
  }

  loadSlots(): void {
    const dateStr = this.selectedDate().toISOString().split('T')[0];
    this.scheduleService.getDaySchedule(dateStr).subscribe({
      next: (res: DoctorSlot[]) => this.slots.set(res || []),
      error: () => this.slots.set([])
    });
  }

  private generateSlotsFromAvailability(date: Date): DoctorSlot[] {
    const dayIndex = date.getDay();
    if (!this.workingDays().includes(dayIndex)) return [];

    const slots: DoctorSlot[] = [];
    const start = this.toMinutes(this.workingStart());
    const end = this.toMinutes(this.workingEnd());
    const breakStart = this.toMinutes(this.breakStart());
    const breakEnd = this.toMinutes(this.breakEnd());
    const step = this.slotDurationMinutes();

    for (let t = start; t < end; t += step) {
      const slotEnd = Math.min(t + step, end);
      const inBreak = t < breakEnd && slotEnd > breakStart;
      if (inBreak) continue;
      slots.push({
        startTime: this.toTimeString(t),
        endTime: this.toTimeString(slotEnd),
        status: 'available',
      });
    }
    return slots;
  }

  private mergeAppointmentsIntoSlots(date: Date, baseSlots: DoctorSlot[]): DoctorSlot[] {
    const dateStr = this.toDateOnly(date);
    return baseSlots.map((slot) => {
      const appt = this.getAppointmentForSlot(slot, dateStr);
      if (!appt) return slot;
      return {
        ...slot,
        status: this.mapStatus(appt.status),
        appointmentId: appt.id,
        blockedReason: appt.reason,
      };
    });
  }

  private buildDaySlots(date: Date): DoctorSlot[] {
    const serverSlots = this.getSlots();
    const baseSlots = serverSlots.length ? serverSlots : this.generateSlotsFromAvailability(date);
    return this.mergeAppointmentsIntoSlots(date, baseSlots).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }

  setAvailableSlot(slot: DoctorSlot): void {
    const dateStr = this.selectedDate().toISOString().split('T')[0];
    const startTime = slot.startTime || slot.time!;
    const endTime = slot.endTime || startTime;
    this.scheduleService.setAvailable(dateStr, startTime, endTime).subscribe(() => this.loadSlots());
  }

  blockSlot(slot: DoctorSlot): void {
    const dateStr = this.selectedDate().toISOString().split('T')[0];
    const startTime = slot.startTime || slot.time!;
    const endTime = slot.endTime || startTime;
    this.scheduleService.blockSlot(dateStr, startTime, endTime).subscribe(() => this.loadSlots());
  }

  getSlotStatus(slot: DoctorSlot): string {
    return slot?.status || 'available';
  }

  getAppointmentForSlot(slot: DoctorSlot, dateStr?: string): Appointment | null {
    const dayStr = dateStr || this.toDateOnly(this.selectedDate());
    const startTime = slot.startTime || slot.time || '';
    return this.appointments().find(
      apt => apt.appointmentDate === dayStr && apt.appointmentTime.startsWith(startTime)
    ) || null;
  }

  mapStatus(status: AppointmentStatus | string): 'available' | 'booked' | 'blocked' | 'pending' | 'cancelled' | 'completed' {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return 'booked';
      case AppointmentStatus.PENDING:
        return 'pending';
      case AppointmentStatus.CANCELLED:
        return 'cancelled';
      case AppointmentStatus.COMPLETED:
        return 'completed';
      default:
        return 'booked';
    }
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

  // ==================== Quick actions ====================
  acceptAppointment(appt: Appointment): void {
    this.updateAppointmentStatus(appt, AppointmentStatus.CONFIRMED);
  }

  rejectAppointment(appt: Appointment): void {
    this.appointmentService.cancel(appt.id).subscribe(() => this.loadAppointments());
  }

  completeAppointment(appt: Appointment): void {
    this.updateAppointmentStatus(appt, AppointmentStatus.COMPLETED);
  }

  rescheduleAppointment(appt: Appointment): void {
    const newTime = prompt('Enter new time (HH:mm)', appt.appointmentTime.slice(0,5));
    if (!newTime) return;
    this.appointmentService.update(appt.id, { appointmentTime: newTime }).subscribe(() => this.loadAppointments());
  }

  private updateAppointmentStatus(appt: Appointment, status: AppointmentStatus): void {
    this.appointmentService.update(appt.id, { status }).subscribe(() => this.loadAppointments());
  }

  joinCall(appt: Appointment): void {
    if (!appt.isVideoConsultation) return;
    this.router.navigate(['/call', appt.id]);
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

  setViewMode(mode: 'day' | 'week' | 'month'): void {
    this.viewMode.set(mode);
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private toTimeString(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    return new Date(d.setDate(diff));
  }

  private getNextAppointment(): Appointment | null {
    const now = new Date();
    const upcoming = this.appointments()
      .filter((apt) => apt.status !== AppointmentStatus.CANCELLED)
      .map((apt) => {
        const dt = new Date(`${apt.appointmentDate}T${apt.appointmentTime}`);
        return { apt, dt };
      })
      .filter(({ dt }) => dt >= now)
      .sort((a, b) => a.dt.getTime() - b.dt.getTime());
    return upcoming.length ? upcoming[0].apt : null;
  }
}
