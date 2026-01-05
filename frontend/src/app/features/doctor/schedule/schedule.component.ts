import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { SettingsService } from '@core/services/settings.service';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AppointmentService } from '@core/services/appointment.service';
import { AuthService } from '@core/services/auth.service';
import { BadgeService } from '@core/services/badge.service';
import { MessageService } from '@core/services/message.service';
import { NotificationService } from '@core/services/notification.service';
import { ToastService } from '@core/services/toast.service';
import { SchedulingService, DoctorSlot } from '../../../core/services/schedule.service';

import { Appointment, AppointmentStatus } from '@core/models/appointment.model';
import { DoctorSidebarComponent } from '../shared/doctor-sidebar/doctor-sidebar.component';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-doctor-schedule',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterModule,
    FormsModule,
    DoctorSidebarComponent,
    DoctorHeaderComponent
  ],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css']
})
export class ScheduleComponent implements OnInit {
  readonly DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  constructor(
    private settingsService: SettingsService,
    private badgeService: BadgeService,
    private scheduleService: SchedulingService,
    private appointmentService: AppointmentService,
    private messageService: MessageService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  goHome() {
    this.router.navigate(['/']);
  }
    private updateAppointmentStatus(appt: Appointment, status: AppointmentStatus, successMsg: string): void {
      this.appointmentService.update(appt.id, { status }).subscribe({
        next: () => { this.toast.success(successMsg, { title: 'Appointments' }); this.loadAppointments(); },
        error: () => this.toast.error('Failed to update appointment', { title: 'Appointments' })
      });
    }
  getDoctorInitials(): string {
    const user = this.currentUser();
    if (!user) return 'DR';
    const parts = `${user.firstName} ${user.lastName}`.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].substring(0, 2).toUpperCase();
  }

  setTheme(mode: 'light' | 'dark'): void {
    this.themeMode.set(mode);
  }

  setViewMode(mode: 'day' | 'week' | 'month'): void {
    this.viewMode.set(mode);
  }

  getMonthYear(): string {
    return this.currentMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

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

  isSelected(date: Date): boolean {
    return date.toDateString() === this.selectedDate().toDateString();
  }

  isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentMonth().getMonth();
  }

  toggleWorkingDay(day: number): void {
    const set = new Set(this.workingDays());
    const wasSelected = set.has(day);
    if (wasSelected) {
      set.delete(day);
      this.toast.info(`${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day]} removed from availability.`, { title: 'Schedule' });
    } else {
      set.add(day);
      this.toast.success(`${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day]} added to availability!`, { title: 'Schedule' });
    }
    this.workingDays.set(Array.from(set).sort());
  }

  saveAvailability(): void {
    // Convert workingDays (numbers) to availableDays (names)
    const availableDays = this.workingDays().map(d => this.DAY_NAMES[d]);
    // Save to settings (ensure backend gets availableDays)
    this.settingsService.updateSettings({
      availableDays,
      startTime: this.workingStart(),
      endTime: this.workingEnd()
    }).subscribe({
      next: () => {
        this.toast.success('Availability saved', { title: 'Schedule' });
        this.loadSlots();
      },
      error: () => {
        this.toast.error('Failed to save availability', { title: 'Schedule' });
        this.loadSlots();
      }
    });
  }

  getSelectedDateAppointments(): Appointment[] {
    const dateStr = this.toDateOnly(this.selectedDate());
    return this.appointments().filter(a => a.appointmentDate === dateStr);
  }

  countAppointmentsForDate(date: Date): number {
    const dateStr = this.toDateOnly(date);
    return this.appointments().filter(a => a.appointmentDate === dateStr).length;
  }

  formatTime12(time: string | null | undefined): string {
    const t = (time || '').slice(0,5);
    const [hStr, mStr] = t.split(':');
    const h = Number(hStr || 0);
    const m = Number(mStr || 0);
    if (Number.isNaN(h) || Number.isNaN(m)) return t || '';
    const period = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2,'0')} ${period}`;
  }

  formatRange12(start?: string | null, end?: string | null): string {
    return `${this.formatTime12(start || '')} - ${this.formatTime12(end || start || '')}`;
  }

  joinCall(appt: Appointment): void {
    if (!appt.isVideoConsultation) return;
    this.router.navigate(['/call', appt.id]);
  }

  acceptAppointment(appt: Appointment): void {
    this.updateAppointmentStatus(appt, AppointmentStatus.CONFIRMED, 'Appointment accepted');
  }

  rejectAppointment(appt: Appointment): void {
    this.appointmentService.cancel(appt.id).subscribe({
      next: () => { this.toast.success('Appointment cancelled', { title: 'Appointments' }); this.loadAppointments(); },
      error: () => this.toast.error('Failed to cancel appointment', { title: 'Appointments' })
    });
  }

  rescheduleAppointment(appt: Appointment): void {
    const newTime = prompt('Enter new time (HH:mm)', appt.appointmentTime.slice(0,5));
    if (!newTime) return;
    this.appointmentService.update(appt.id, { appointmentTime: newTime }).subscribe({
      next: () => { this.toast.success('Appointment rescheduled', { title: 'Appointments' }); this.loadAppointments(); },
      error: () => this.toast.error('Failed to reschedule appointment', { title: 'Appointments' })
    });
  }

  completeAppointment(appt: Appointment): void {
    this.updateAppointmentStatus(appt, AppointmentStatus.COMPLETED, 'Appointment completed');
  }

  blockSlot(slot: DoctorSlot): void {
    const dateStr = this.toDateOnly(this.selectedDate());
    this.scheduleService.blockSlot(dateStr, slot.startTime!, slot.endTime!).subscribe({
      next: () => { this.toast.success('Slot blocked', { title: 'Schedule' }); this.loadSlots(); },
      error: () => this.toast.error('Failed to block slot', { title: 'Schedule' })
    });
  }
  
removeSlot(slot: DoctorSlot, date: Date | string): void {
  this.scheduleService.removeSlot(
    date,
    slot.startTime || slot.time || '',
    slot.endTime,
    this.authService.currentUser()?.id
  ).subscribe({
    next: () => this.toast.success('Slot removed successfully', { title: 'Schedule' }),
    error: () => this.toast.error('Failed to remove slot', { title: 'Schedule' })
  });
}


  openNextAppointmentDay(): void {
    const next = this.nextAppointment();
    if (!next) return;
    this.setViewMode('day');
    this.selectDate(new Date(next.appointmentDate));
  }

  appointments = signal<Appointment[]>([]);
  slots = signal<DoctorSlot[]>([]);
  isLoading = signal(true);
  selectedDate = signal(new Date());
  currentMonth = signal(new Date());
  currentUser = signal<any>(null);
  menuItems = signal<MenuItem[]>([]);
  unreadMessages = signal(0);
  unreadNotifications = signal(0);

  viewMode = signal<'day' | 'week' | 'month'>('day');
  readonly viewModes = ['day', 'week', 'month'] as const;

  slotDurationMinutes = signal(30);
  workingStart = signal('09:00');
  workingEnd = signal('17:00');
  hasBreak = signal(true);
  breakStart = signal('12:00');
  breakEnd = signal('13:00');
  workingDays = signal<number[]>([1, 2, 3, 4, 5]);
  showAvailabilityEditor = signal(false);
  themeMode = signal<'light' | 'dark'>('light');

  today = new Date();



  weekDays = computed(() => {
    const start = this.getWeekStart(this.selectedDate());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  });

  daySlots = computed(() => this.buildDaySlots(this.selectedDate()));
  hasBlockedSlots = computed(() => this.daySlots().some(s => (s.status || 'available') === 'blocked'));
  visibleDaySlots = computed(() =>
    this.daySlots()
      .filter(s => (s.status || 'available') !== 'blocked')
      .filter(s => !this.isPastSlot(s))
  );
  noVisibleButHasSlots = computed(() => !this.visibleDaySlots().length && !!this.daySlots().length);
  nextAppointment = computed(() => this.getNextAppointment());



  ngOnInit(): void {
    this.loadUserData();
    this.loadAppointments();
    this.loadBadgeCounts();
    this.loadSlots();
    this.loadHeaderCounts();
  }

  hasAppointments(date: Date): boolean {
    return this.appointments().some(a =>
      new Date(a.appointmentDate).toDateString() === date.toDateString()
    );
  }

  loadSlots(): void {
    const dateStr = this.toDateOnly(this.selectedDate());
    this.scheduleService.getDaySchedule(dateStr).subscribe({
      next: res => this.slots.set(res || []),
      error: () => this.slots.set([])
    });
  }

  getSlots(): DoctorSlot[] {
    return [...this.slots()]
      .map(s => ({
        ...s,
        startTime: s.startTime || s.time || '',
        endTime: s.endTime || s.startTime || s.time || ''
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  


  private buildDaySlots(date: Date): DoctorSlot[] {
    const base = this.getSlots();
    return base.map(slot => {
      const appt = this.getAppointmentForSlot(slot);
      return appt
        ? { ...slot, status: this.mapStatus(appt.status), appointmentId: appt.id }
        : slot;
    });
  }

  getAppointmentForSlot(slot: DoctorSlot): Appointment | null {
    const day = this.toDateOnly(this.selectedDate());
    const time = slot.startTime || slot.time || '';
    return this.appointments().find(
      a => a.appointmentDate === day && a.appointmentTime.startsWith(time)
    ) || null;
  }

  isPastSlot(slot: DoctorSlot): boolean {
    const end = slot.endTime || slot.startTime || '';
    const date = new Date(`${this.toDateOnly(this.selectedDate())}T${end}:00`);
    return date.getTime() < Date.now();
  }

  mapStatus(status: AppointmentStatus | string): any {
    switch (status) {
      case AppointmentStatus.CONFIRMED: return 'booked';
      case AppointmentStatus.PENDING: return 'pending';
      case AppointmentStatus.CANCELLED: return 'cancelled';
      case AppointmentStatus.COMPLETED: return 'completed';
      default: return 'booked';
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

  loadHeaderCounts(): void {
    this.notificationService.getUnreadCount().subscribe(c =>
      this.unreadNotifications.set(c || 0)
    );
  }

  updateMenuItems(apt: number, msg: number): void {
    this.menuItems.set([
      { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
      { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: apt || undefined },
      { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
      { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: msg || undefined },
      { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' }
    ]);
  }

  loadUserData(): void {
    this.currentUser.set(this.authService.currentUser());
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.appointmentService.getMyAppointments().subscribe({
      next: d => {
        this.appointments.set(d);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  selectDate(date: Date): void {
    this.selectedDate.set(date);
    this.loadSlots();
  }

  previousMonth(): void {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() - 1);
    this.currentMonth.set(d);
  }

  nextMonth(): void {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() + 1);
    this.currentMonth.set(d);
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d;
  }

  private getNextAppointment(): Appointment | null {
    const now = new Date();
    return this.appointments()
      .map(a => ({ a, t: new Date(`${a.appointmentDate}T${a.appointmentTime}`) }))
      .filter(x => x.t >= now)
      .sort((a, b) => a.t.getTime() - b.t.getTime())[0]?.a || null;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
