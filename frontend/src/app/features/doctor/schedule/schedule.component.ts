import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '@core/services/appointment.service';
import { Appointment, AppointmentStatus } from '@core/models/appointment.model';
import { AuthService } from '@core/services/auth.service';
import { BadgeService } from '@core/services/badge.service';
import { MessageService } from '@core/services/message.service';
import { NotificationService } from '@core/services/notification.service';
import { forkJoin } from 'rxjs';
import { ToastService } from '@core/services/toast.service';
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
  unreadMessages = signal(0);
  unreadNotifications = signal(0);

  viewMode = signal<'day' | 'week' | 'month'>('day');
  slotDurationMinutes = signal(30);
  workingStart = signal('09:00');
  workingEnd = signal('17:00');
  // Make break optional via toggle
  hasBreak = signal(true);
  breakStart = signal('12:00');
  breakEnd = signal('13:00');
  workingDays = signal<number[]>([1, 2, 3, 4, 5]);
  showAvailabilityEditor = signal(false);
  showLegend = signal(true);
  themeMode = signal<'light' | 'dark'>('light');

  today = new Date();

  private badgeService = inject(BadgeService);
  private scheduleService = inject(SchedulingService);
  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

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
  hasBlockedSlots = computed(() => (this.daySlots() || []).some(s => (s.status || 'available') === 'blocked'));
  visibleDaySlots = computed(() => (this.daySlots() || [])
    .filter((s) => (s.status || 'available') !== 'blocked')
    .filter((s) => !this.isPastSlot(s)));
  noVisibleButHasSlots = computed(() => !this.visibleDaySlots().length && !!(this.daySlots() || []).length);
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
    this.loadHeaderCounts();
  }

  // ==================== Availability ====================
  toggleWorkingDay(day: number): void {
    const set = new Set(this.workingDays());
    set.has(day) ? set.delete(day) : set.add(day);
    const updated = Array.from(set).sort();
    this.workingDays.set(updated);
    this.scheduleService.updateWorkingDays(updated).subscribe({
      next: () => this.toast.success('Working days updated', { title: 'Schedule' }),
      error: () => this.toast.error('Failed to update working days', { title: 'Schedule' }),
    });
  }

  saveAvailability(): void {
    // Persist current day's availability to backend
    const dateStr = this.toDateOnly(this.selectedDate());
    this.scheduleService.setAvailable(dateStr, this.workingStart(), this.workingEnd()).subscribe({
      next: () => {
        this.toast.success('Availability saved', { title: 'Schedule' });
        this.loadSlots();
      },
      error: () => {
        this.toast.error('Failed to save availability', { title: 'Schedule' });
        this.loadSlots();
      },
    });
  }

  setAvailability(): void {
    const dateStr = this.selectedDate().toISOString().split('T')[0];
    if (this.availabilityMode() === 'single') {
      const time = this.singleTime();
      this.scheduleService.setAvailable(dateStr, time).subscribe({
        next: () => {
          this.toast.success('Marked as available', { title: 'Schedule' });
          this.loadSlots();
        },
        error: () => {
          this.toast.error('Failed to mark available', { title: 'Schedule' });
          this.loadSlots();
        },
      });
    } else {
      const start = this.rangeStart();
      const end = this.rangeEnd();
      this.scheduleService.setAvailable(dateStr, start, end).subscribe({
        next: () => {
          this.toast.success('Marked as available', { title: 'Schedule' });
          this.loadSlots();
        },
        error: () => {
          this.toast.error('Failed to mark available', { title: 'Schedule' });
          this.loadSlots();
        },
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
    const useBreak = this.hasBreak() && !!this.breakStart() && !!this.breakEnd();
    const breakStart = useBreak ? this.toMinutes(this.breakStart()) : -1;
    const breakEnd = useBreak ? this.toMinutes(this.breakEnd()) : -1;
    const step = this.slotDurationMinutes();

    for (let t = start; t < end; t += step) {
      const slotEnd = Math.min(t + step, end);
      const inBreak = useBreak && t < breakEnd && slotEnd > breakStart;
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
    this.scheduleService.setAvailable(dateStr, startTime, endTime).subscribe({
      next: () => {
        this.toast.success('Marked as available', { title: 'Schedule' });
        this.loadSlots();
      },
      error: () => this.toast.error('Failed to mark available', { title: 'Schedule' }),
    });
  }

  blockSlot(slot: DoctorSlot): void {
    const dateStr = this.selectedDate().toISOString().split('T')[0];
    const startTime = slot.startTime || slot.time!;
    const endTime = slot.endTime || startTime;
    this.scheduleService.blockSlot(dateStr, startTime, endTime).subscribe({
      next: () => {
        this.toast.success('Slot blocked', { title: 'Schedule' });
        this.loadSlots();
      },
      error: () => this.toast.error('Failed to block slot', { title: 'Schedule' }),
    });
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

  isPastSlot(slot: DoctorSlot): boolean {
    const dateStr = this.toDateOnly(this.selectedDate());
    const end = (slot.endTime || slot.startTime || slot.time || '').trim();
    if (!dateStr || !end) return false;
    const now = new Date();
    const target = new Date(`${dateStr}T${end}:00`);
    return target.getTime() < now.getTime();
  }

  // ===== Time formatting (12-hour) =====
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
    const s = this.formatTime12(start || '');
    const e = this.formatTime12(end || start || '');
    return `${s} - ${e}`;
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
      const msgCount = messages.count || 0;
      this.unreadMessages.set(msgCount);
      this.updateMenuItems(appointments.count || 0, msgCount);
    });
  }

  loadHeaderCounts(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotifications.set(count || 0),
      error: () => this.unreadNotifications.set(0),
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

  setTheme(mode: 'light' | 'dark'): void {
    this.themeMode.set(mode);
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

  countAppointmentsForDate(date: Date): number {
    const dateStr = this.toDateOnly(date);
    return this.appointments().filter((apt) => apt.appointmentDate === dateStr).length;
  }

  // ==================== Quick actions ====================
  acceptAppointment(appt: Appointment): void {
    this.updateAppointmentStatus(appt, AppointmentStatus.CONFIRMED, 'Appointment accepted');
  }

  rejectAppointment(appt: Appointment): void {
    this.appointmentService.cancel(appt.id).subscribe({
      next: () => {
        this.toast.success('Appointment cancelled', { title: 'Appointments' });
        this.loadAppointments();
      },
      error: () => this.toast.error('Failed to cancel appointment', { title: 'Appointments' }),
    });
  }

  completeAppointment(appt: Appointment): void {
    this.updateAppointmentStatus(appt, AppointmentStatus.COMPLETED, 'Appointment completed');
  }

  rescheduleAppointment(appt: Appointment): void {
    const newTime = prompt('Enter new time (HH:mm)', appt.appointmentTime.slice(0,5));
    if (!newTime) return;
    this.appointmentService.update(appt.id, { appointmentTime: newTime }).subscribe({
      next: () => {
        this.toast.success('Appointment rescheduled', { title: 'Appointments' });
        this.loadAppointments();
      },
      error: () => this.toast.error('Failed to reschedule appointment', { title: 'Appointments' }),
    });
  }

  private updateAppointmentStatus(appt: Appointment, status: AppointmentStatus, successMsg?: string): void {
    this.appointmentService.update(appt.id, { status }).subscribe({
      next: () => {
        if (successMsg) this.toast.success(successMsg, { title: 'Appointments' });
        this.loadAppointments();
      },
      error: () => this.toast.error('Failed to update appointment', { title: 'Appointments' }),
    });
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

  openNextAppointmentDay(): void {
    const next = this.nextAppointment();
    if (!next) return;
    this.setViewMode('day');
    this.selectDate(new Date(next.appointmentDate));
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
