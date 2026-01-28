import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SchedulingService, DoctorSlot } from '@core/services/schedule.service';
import { DoctorService, DoctorListItem } from '@core/services/doctor.service';
import { ThemeService } from '@core/services/theme.service';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-receptionist-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SidebarComponent],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css'],
})
export class ReceptionistScheduleComponent implements OnInit {
  private readonly schedulingService = inject(SchedulingService);
  private readonly doctorService = inject(DoctorService);
  private readonly toast = inject(ToastService);
  themeService = inject(ThemeService);

  doctors = signal<DoctorListItem[]>([]);
  slots = signal<DoctorSlot[]>([]);
  selectedDoctorId = signal<string>('');
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  startTime = signal('09:00');
  endTime = signal('17:00');
  isLoading = signal(false);
  statusMessage = signal('');

  menuItems = [
    { label: 'Dashboard', icon: 'grid', route: '/receptionist/dashboard' },
    { label: 'Appointments', icon: 'calendar', route: '/receptionist/appointments' },
    { label: 'Patients', icon: 'people', route: '/receptionist/patients' },
    { label: 'Schedule', icon: 'clock', route: '/receptionist/schedule' },
  ];

  ngOnInit(): void {
    this.loadDoctors();
  }

  private isPastDateTime(dateStr: string, timeStr: string): boolean {
    if (!dateStr || !timeStr) return false;
    const now = new Date();
    const target = new Date(`${dateStr}T${timeStr}:00`);
    return target.getTime() < now.getTime();
  }

  isPastSlot(slot: DoctorSlot): boolean {
    const date = this.selectedDate();
    const end = (slot.endTime || slot.startTime || slot.time || '').trim();
    if (!date || !end) return false;
    const now = new Date();
    const target = new Date(`${date}T${end}:00`);
    return target.getTime() < now.getTime();
  }

  loadDoctors(): void {
    this.doctorService.listDoctors().subscribe({
      next: (list) => {
        this.doctors.set(list || []);
        if (!this.selectedDoctorId() && list?.length) {
          this.selectedDoctorId.set(list[0].id);
          this.loadSlots();
        }
      },
      error: () => this.statusMessage.set('Could not load doctors'),
    });
  }

  loadSlots(): void {
    const doctorId = this.selectedDoctorId();
    if (!doctorId || !this.selectedDate()) return;
    this.isLoading.set(true);
    this.schedulingService.getDaySchedule(this.selectedDate(), doctorId).subscribe({
      next: (res) => {
        this.slots.set(res.slots || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.slots.set([]);
        this.isLoading.set(false);
      },
    });
  }

  setAvailable(): void {
    const doctorId = this.selectedDoctorId();
    if (!doctorId) return;
    this.statusMessage.set('');
    // Prevent setting availability in the past
    if (this.isPastDateTime(this.selectedDate(), this.endTime())) {
      this.toast.error('Cannot modify past time', { title: 'Schedule' });
      return;
    }
    this.schedulingService
      .setAvailable(this.selectedDate(), this.startTime(), this.endTime(), doctorId)
      .subscribe({
        next: () => {
          this.statusMessage.set('');
          this.toast.success('Slot saved as available', { title: 'Schedule' });
          this.loadSlots();
        },
        error: () => {
          this.statusMessage.set('');
          this.toast.error('Failed to save availability', { title: 'Schedule' });
        },
      });
  }

  blockSlot(): void {
    const doctorId = this.selectedDoctorId();
    if (!doctorId) return;
    this.statusMessage.set('');
    // Prevent blocking a past time
    if (this.isPastDateTime(this.selectedDate(), this.endTime())) {
      this.toast.error('Cannot modify past time', { title: 'Schedule' });
      return;
    }
    this.schedulingService
      .blockSlot(this.selectedDate(), this.startTime(), this.endTime(), doctorId)
      .subscribe({
        next: () => {
          this.statusMessage.set('');
          this.toast.success('Slot blocked', { title: 'Schedule' });
          this.loadSlots();
        },
        error: () => {
          this.statusMessage.set('');
          this.toast.error('Failed to block slot', { title: 'Schedule' });
        },
      });
  }

  unblock(slot: DoctorSlot): void {
    const doctorId = this.selectedDoctorId();
    if (!doctorId) return;
    const start = slot.startTime || slot.time || '';
    const end = slot.endTime || start;
    this.schedulingService.unblockSlot(this.selectedDate(), start, end, doctorId).subscribe({
      next: () => {
        this.toast.success('Slot unblocked', { title: 'Schedule' });
        this.loadSlots();
      },
      error: () => {
        this.toast.error('Failed to unblock slot', { title: 'Schedule' });
      },
    });
  }

  setAvailableFromSlot(slot: DoctorSlot): void {
    const doctorId = this.selectedDoctorId();
    if (!doctorId) return;
    const start = slot.startTime || slot.time || '';
    const end = slot.endTime || start;
    if (this.isPastDateTime(this.selectedDate(), end)) {
      this.toast.error('Cannot modify past time', { title: 'Schedule' });
      return;
    }
    this.schedulingService.setAvailable(this.selectedDate(), start, end, doctorId).subscribe({
      next: () => {
        this.toast.success('Marked as available', { title: 'Schedule' });
        this.loadSlots();
      },
      error: () => {
        this.toast.error('Failed to mark available', { title: 'Schedule' });
      },
    });
  }

  blockSlotFromSlot(slot: DoctorSlot): void {
    const doctorId = this.selectedDoctorId();
    if (!doctorId) return;
    const start = slot.startTime || slot.time || '';
    const end = slot.endTime || start;
    if (this.isPastDateTime(this.selectedDate(), end)) {
      this.toast.error('Cannot modify past time', { title: 'Schedule' });
      return;
    }
    this.schedulingService.blockSlot(this.selectedDate(), start, end, doctorId).subscribe({
      next: () => {
        this.toast.success('Blocked this time', { title: 'Schedule' });
        this.loadSlots();
      },
      error: () => {
        this.toast.error('Failed to block slot', { title: 'Schedule' });
      },
    });
  }

  onDoctorChange(): void {
    this.loadSlots();
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
    return `${s} – ${e}`;
  }

  
}
