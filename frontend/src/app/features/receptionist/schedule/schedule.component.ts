import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SchedulingService, DoctorSlot } from '@core/services/schedule.service';
import { DoctorService, DoctorListItem } from '@core/services/doctor.service';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';

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

  doctors = signal<DoctorListItem[]>([]);
  slots = signal<DoctorSlot[]>([]);
  selectedDoctorId = signal<string>('');
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  startTime = signal('09:00');
  endTime = signal('17:00');
  isLoading = signal(false);
  statusMessage = signal('');
  toasts = signal<{ id: number; text: string; type: 'success' | 'error' | 'info' }[]>([]);

  menuItems = [
    { label: 'Dashboard', icon: 'grid', route: '/receptionist/dashboard' },
    { label: 'Appointments', icon: 'calendar', route: '/receptionist/appointments' },
    { label: 'Patients', icon: 'people', route: '/receptionist/patients' },
    { label: 'Schedule', icon: 'clock', route: '/receptionist/schedule' },
  ];

  ngOnInit(): void {
    this.loadDoctors();
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
      next: (slots) => {
        this.slots.set(slots || []);
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
    this.schedulingService
      .setAvailable(this.selectedDate(), this.startTime(), this.endTime(), doctorId)
      .subscribe({
        next: () => {
          this.statusMessage.set('Slot saved as available');
          this.showToast('Slot saved as available', 'success');
          this.loadSlots();
        },
        error: () => {
          this.statusMessage.set('Failed to save availability');
          this.showToast('Failed to save availability', 'error');
        },
      });
  }

  blockSlot(): void {
    const doctorId = this.selectedDoctorId();
    if (!doctorId) return;
    this.statusMessage.set('');
    this.schedulingService
      .blockSlot(this.selectedDate(), this.startTime(), this.endTime(), doctorId)
      .subscribe({
        next: () => {
          this.statusMessage.set('Slot blocked');
          this.showToast('Slot blocked', 'success');
          this.loadSlots();
        },
        error: () => {
          this.statusMessage.set('Failed to block slot');
          this.showToast('Failed to block slot', 'error');
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
        this.showToast('Slot unblocked', 'success');
        this.loadSlots();
      },
      error: () => {
        this.statusMessage.set('Failed to unblock slot');
        this.showToast('Failed to unblock slot', 'error');
      },
    });
  }

  setAvailableFromSlot(slot: DoctorSlot): void {
    const doctorId = this.selectedDoctorId();
    if (!doctorId) return;
    const start = slot.startTime || slot.time || '';
    const end = slot.endTime || start;
    this.schedulingService.setAvailable(this.selectedDate(), start, end, doctorId).subscribe({
      next: () => {
        this.showToast('Marked as available', 'success');
        this.loadSlots();
      },
      error: () => {
        this.statusMessage.set('Failed to mark available');
        this.showToast('Failed to mark available', 'error');
      },
    });
  }

  blockSlotFromSlot(slot: DoctorSlot): void {
    const doctorId = this.selectedDoctorId();
    if (!doctorId) return;
    const start = slot.startTime || slot.time || '';
    const end = slot.endTime || start;
    this.schedulingService.blockSlot(this.selectedDate(), start, end, doctorId).subscribe({
      next: () => {
        this.showToast('Blocked this time', 'success');
        this.loadSlots();
      },
      error: () => {
        this.statusMessage.set('Failed to block slot');
        this.showToast('Failed to block slot', 'error');
      },
    });
  }

  onDoctorChange(): void {
    this.loadSlots();
  }

  private showToast(text: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Date.now() + Math.random();
    const list = [...this.toasts()];
    list.push({ id, text, type });
    this.toasts.set(list);
    setTimeout(() => {
      this.toasts.set(this.toasts().filter((t) => t.id !== id));
    }, 3000);
  }
}
