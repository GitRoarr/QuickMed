import { Component, OnInit, signal, computed } from '@angular/core';
import { SettingsService } from '@core/services/settings.service';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AppointmentService } from '@core/services/appointment.service';
import { AuthService } from '@core/services/auth.service';
import { MessageService } from '@core/services/message.service';
import { NotificationService } from '@core/services/notification.service';
import { ToastService } from '@core/services/toast.service';
import { SchedulingService, DoctorSlot } from '../../../core/services/schedule.service';

import { DoctorAnalyticsService } from '@core/services/doctor-analytics.service';
import { ConflictDetectionService } from '@core/services/conflict-detection.service';

import { Appointment, AppointmentStatus } from '@core/models/appointment.model';

import { DailyStats } from '@core/models/doctor-analytics.model';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';


@Component({
  selector: 'app-doctor-schedule',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule, FormsModule, DoctorHeaderComponent],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css']
})
export class ScheduleComponent implements OnInit {
  readonly DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  readonly viewModes = ['day', 'week', 'month'] as const;

  constructor(
    private settingsService: SettingsService,
    private scheduleService: SchedulingService,
    private appointmentService: AppointmentService,
    private messageService: MessageService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private toast: ToastService,

    private analyticsService: DoctorAnalyticsService,
    private conflictService: ConflictDetectionService
  ) { }

  // Signals
  appointments = signal<Appointment[]>([]);
  slots = signal<DoctorSlot[]>([]);

  todayStats = signal<DailyStats | null>(null);
  isLoading = signal(true);
  selectedDate = signal(new Date());
  currentMonth = signal(new Date());
  currentUser = signal<any>(null);
  unreadNotifications = signal(0);
  viewMode = signal<'day' | 'week' | 'month'>('day');
  slotDurationMinutes = signal(30);
  workingStart = signal('02:00');
  workingEnd = signal('18:00');
  workingDays = signal<number[]>([]);
  themeMode = signal<'light' | 'dark'>('light');

  draggedSlot = signal<DoctorSlot | null>(null);
  sessions = signal<Record<string, boolean>>({ morning: false, break: false, evening: false });
  expandedSessions = signal<Record<string, boolean>>({ morning: false, break: false, evening: false });

  readonly SESSION_CONFIG: Record<string, { label: string, icon: string, time: string, start: string, end: string }> = {
    morning: { label: 'Morning', icon: '🌅', time: '09:00 AM – 12:00 PM', start: '09:00', end: '12:00' },
    break: { label: 'Break', icon: '☕', time: '12:00 PM – 02:00 PM', start: '12:00', end: '14:00' },
    evening: { label: 'Evening', icon: '🌆', time: '02:00 PM – 08:00 PM', start: '14:00', end: '20:00' },
  };

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
  visibleDaySlots = computed(() =>
    this.daySlots()
      .filter(s => (s.status || 'available') !== 'blocked')
      .filter(s => !this.isPastSlot(s))
  );
  nextAppointment = computed(() => this.getNextAppointment());

  ngOnInit(): void {
    this.loadUserData();
    this.loadAppointments();
    this.loadSettings();
    this.loadSlots();
    this.loadHeaderCounts();
    this.loadWorkingDays();

    this.loadAnalytics();
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
      this.toast.info(`${this.DAY_NAMES[day]} removed from availability.`, { title: 'Schedule' });
    } else {
      set.add(day);
      this.toast.success(`${this.DAY_NAMES[day]} added to availability!`, { title: 'Schedule' });
    }
    this.workingDays.set(Array.from(set).sort());
    this.saveAvailability();
  }

  saveAvailability(): void {
    this.scheduleService.updateWorkingDays(this.workingDays()).subscribe({
      next: () => {
        const availableDays = this.workingDays().map(d => this.DAY_NAMES[d]);
        this.settingsService.updateSettings({
          availableDays,
          startTime: this.workingStart(),
          endTime: this.workingEnd(),
          appointmentDuration: this.slotDurationMinutes()
        }).subscribe({
          next: () => {
            this.toast.success('Availability saved successfully', { title: 'Schedule' });
            this.loadSlots();
          },
          error: () => this.toast.error('Failed to save availability settings', { title: 'Schedule' })
        });
      },
      error: () => this.toast.error('Failed to save working days', { title: 'Schedule' })
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
    const t = (time || '').slice(0, 5);
    const [hStr, mStr] = t.split(':');
    const h = Number(hStr || 0);
    const m = Number(mStr || 0);
    if (Number.isNaN(h) || Number.isNaN(m)) return t || '';
    const period = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, '0')} ${period}`;
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
      next: () => {
        this.toast.success('Appointment cancelled', { title: 'Appointments' });
        this.loadAppointments();
        this.loadAnalytics();
      },
      error: () => this.toast.error('Failed to cancel appointment', { title: 'Appointments' })
    });
  }

  rescheduleAppointment(appt: Appointment): void {
    const newTime = prompt('Enter new time (HH:mm)', appt.appointmentTime.slice(0, 5));
    if (!newTime) return;
    this.appointmentService.update(appt.id, { appointmentTime: newTime }).subscribe({
      next: () => {
        this.toast.success('Appointment rescheduled', { title: 'Appointments' });
        this.loadAppointments();
      },
      error: () => this.toast.error('Failed to reschedule appointment', { title: 'Appointments' })
    });
  }

  completeAppointment(appt: Appointment): void {
    this.updateAppointmentStatus(appt, AppointmentStatus.COMPLETED, 'Appointment completed');
  }

  blockSlot(slot: DoctorSlot): void {
    const dateStr = this.toDateOnly(this.selectedDate());
    this.scheduleService.blockSlot(dateStr, slot.startTime!, slot.endTime!).subscribe({
      next: () => {
        this.toast.success('Slot blocked', { title: 'Schedule' });
        this.loadSlots();
      },
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
      next: () => {
        this.toast.success('Slot removed successfully', { title: 'Schedule' });
        this.loadSlots();
      },
      error: () => this.toast.error('Failed to remove slot', { title: 'Schedule' })
    });
  }

  openNextAppointmentDay(): void {
    const next = this.nextAppointment();
    if (!next) return;
    this.setViewMode('day');
    this.selectDate(new Date(next.appointmentDate));
  }



  loadAnalytics(): void {
    this.analyticsService.getTodayStats().subscribe({
      next: stats => this.todayStats.set(stats),
      error: () => console.error('Failed to load analytics')
    });
  }

  onDragStart(event: DragEvent, slot: DoctorSlot): void {
    this.draggedSlot.set(slot);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', '');
    }
  }

  onDragEnd(event: DragEvent): void {
    this.draggedSlot.set(null);
  }

  enableDay(): void {
    const dayOfWeek = this.selectedDate().getDay();
    if (!this.workingDays().includes(dayOfWeek)) {
      this.toggleWorkingDay(dayOfWeek);
      this.saveAvailability();
    }
  }

  generateSlots(): void {
    const data = {
      date: this.toDateOnly(this.selectedDate()),
      startTime: this.workingStart(),
      endTime: this.workingEnd(),
      slotDuration: this.slotDurationMinutes()
    };

    this.scheduleService.generateSlots(data).subscribe({
      next: (res) => {
        this.toast.success('Slots generated successfully', { title: 'Schedule' });
        this.loadSlots();
      },
      error: () => this.toast.error('Failed to generate slots', { title: 'Schedule' })
    });
  }

  saveSessionSchedule(): void {
    const data = {
      date: this.toDateOnly(this.selectedDate()),
      sessions: this.sessions(),
      slotDuration: this.slotDurationMinutes()
    };

    this.scheduleService.updateSessions(data.date, data.sessions, data.slotDuration).subscribe({
      next: () => {
        this.toast.success('Session schedule saved', { title: 'Schedule' });
        this.loadSlots();
      },
      error: () => this.toast.error('Failed to save session schedule', { title: 'Schedule' })
    });
  }

  toggleSession(sessionKey: string): void {
    const current = this.sessions() as any;
    this.sessions.set({
      ...current,
      [sessionKey]: !current[sessionKey]
    });
  }

  toggleSessionPreview(sessionKey: string): void {
    const current = this.expandedSessions();
    this.expandedSessions.set({
      ...current,
      [sessionKey]: !current[sessionKey]
    });
  }

  getSessionSlots(sessionKey: string): DoctorSlot[] {
    const config = (this.SESSION_CONFIG as any)[sessionKey];
    if (!config) return [];
    return this.slots().filter(s => {
      const start = s.startTime || s.time || '';
      return start >= config.start && start < config.end;
    });
  }

  hasAppointments(date: Date): boolean {
    return this.appointments().some(a =>
      new Date(a.appointmentDate).toDateString() === date.toDateString()
    );
  }

  loadSlots(): void {
    const dateStr = this.toDateOnly(this.selectedDate());
    this.scheduleService.getDaySchedule(dateStr).subscribe({
      next: res => {
        this.slots.set(res.slots || []);
        if (res.sessions) {
          this.sessions.set(res.sessions);
        } else {
          this.sessions.set({ morning: false, break: false, evening: false });
        }
        if (res.slotDuration) {
          this.slotDurationMinutes.set(res.slotDuration);
        }
      },
      error: () => {
        this.slots.set([]);
        this.sessions.set({ morning: false, break: false, evening: false });
      }
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

  loadHeaderCounts(): void {
    this.notificationService.getUnreadCount().subscribe(c =>
      this.unreadNotifications.set(c || 0)
    );
  }

  loadSettings(): void {
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        if (settings) {
          this.workingStart.set(settings.startTime || '09:00');
          this.workingEnd.set(settings.endTime || '17:00');
          this.slotDurationMinutes.set(settings.appointmentDuration || 30);
          const dayMap: Record<string, number> = {
            'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
            'Thursday': 4, 'Friday': 5, 'Saturday': 6
          };
          const days = (settings.availableDays || [])
            .map((name: string) => dayMap[name])
            .filter((d: number | undefined): d is number => d !== undefined)
            .sort();
          this.workingDays.set(days);
        }
      },
      error: () => { }
    });
  }

  loadWorkingDays(): void {
    this.scheduleService.getDoctorWorkingDays().subscribe({
      next: (days) => {
        if (days) {
          this.workingDays.set(days);
        }
      },
      error: () => { }
    });
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
        this.loadAnalytics();
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

  private updateAppointmentStatus(appt: Appointment, status: AppointmentStatus, successMsg: string): void {
    this.appointmentService.update(appt.id, { status }).subscribe({
      next: () => {
        this.toast.success(successMsg, { title: 'Appointments' });
        this.loadAppointments();
        this.loadAnalytics();
      },
      error: () => this.toast.error('Failed to update appointment', { title: 'Appointments' })
    });
  }
}
