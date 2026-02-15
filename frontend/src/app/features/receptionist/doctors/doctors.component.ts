import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-receptionist-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, HeaderComponent, SidebarComponent],
  templateUrl: './doctors.component.html',
  styleUrls: ['./doctors.component.css'],
})
export class ReceptionistDoctorsComponent implements OnInit {
  private readonly receptionistService = inject(ReceptionistService);
  private readonly router = inject(Router);
  authService = inject(AuthService);

  menuItems = [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/receptionist/dashboard', exact: true },
    { label: 'Appointments', icon: 'bi-calendar-check', route: '/receptionist/appointments' },
    { label: 'Patients', icon: 'bi-people', route: '/receptionist/patients' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/receptionist/messages' },
    { label: 'Payments', icon: 'bi-cash-stack', route: '/receptionist/payments' },
    {
      label: 'Doctors',
      iconImgLight: 'https://img.icons8.com/?size=100&id=60999&format=png&color=000000',
      iconImgDark: 'https://img.icons8.com/?size=100&id=60999&format=png&color=000000',
      route: '/receptionist/doctors'
    },

    { label: 'Reports', icon: 'bi-bar-chart', route: '/receptionist/reports' },
  ];

  secondaryItems = [
    { label: 'Settings', icon: 'bi-gear', route: '/receptionist/settings' },
    { label: 'Logout', icon: 'bi-box-arrow-right', route: '/receptionist/logout' },
  ];

  dateFilter = signal(new Date().toISOString().split('T')[0]);
  searchQuery = signal('');
  doctors = signal<any[]>([]);
  loading = signal(false);

  filteredDoctors = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const allDoctors = this.doctors();

    if (!query) return allDoctors;

    return allDoctors.filter(doc =>
      doc.name.toLowerCase().includes(query) ||
      (doc.specialty && doc.specialty.toLowerCase().includes(query))
    );
  });


  ngOnInit(): void {
    this.loadAvailability();
  }

  loadAvailability(): void {
    this.loading.set(true);
    this.receptionistService.listDoctorAvailability(this.dateFilter()).subscribe({
      next: (list) => {
        const enrichedList = (list || []).map((doc: any) => {
          const slots = doc.availability?.slots || [];
          const rawShifts = doc.availability?.shifts || [];

          return {
            ...doc,
            availability: {
              ...doc.availability,
              rawShifts, // Store the original array
              shifts: {
                morning: rawShifts.find((s: any) => s.type === 'morning'),
                afternoon: rawShifts.find((s: any) => s.type === 'afternoon'),
                evening: rawShifts.find((s: any) => s.type === 'evening'),
                custom: rawShifts.filter((s: any) => s.type === 'custom'),
              }
            },
            groupedSlots: {
              morning: slots.filter((s: any) => {
                const hour = parseInt((s.startTime || s.time).split(':')[0]);
                return hour < 12;
              }),
              afternoon: slots.filter((s: any) => {
                const hour = parseInt((s.startTime || s.time).split(':')[0]);
                return hour >= 12 && hour < 17;
              }),
              evening: slots.filter((s: any) => {
                const hour = parseInt((s.startTime || s.time).split(':')[0]);
                return hour >= 17;
              }),
            },
          };
        });
        this.doctors.set(enrichedList);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  bookSlot(doc: any, slot: any): void {
    const queryParams: any = {
      doctorId: doc.id,
      date: this.dateFilter(),
    };
    if (slot) {
      queryParams.time = slot.startTime || slot.time;
    }
    this.router.navigate(['/receptionist/appointments'], { queryParams });
  }

  toggleShift(doc: any, shiftType: string): void {
    const rawShifts = doc.availability?.rawShifts;
    if (!rawShifts) return;

    const newShifts = rawShifts.map((s: any) =>
      s.type === shiftType ? { ...s, enabled: !s.enabled } : s
    );

    this.receptionistService.updateDoctorSchedule(doc.id, this.dateFilter(), newShifts, doc.availability.breaks || []).subscribe({
      next: () => {
        this.loadAvailability();
      },
      error: (err) => console.error('Failed to update shift', err)
    });
  }

  // Modal state
  showAddSlotModal = signal(false);
  selectedDoctor = signal<any>(null);
  newSlotDate = signal('');
  newSlotStartTime = signal('');
  newSlotEndTime = signal('');
  errorMessage = signal('');

  addCustomSlot(doc: any): void {
    this.selectedDoctor.set(doc);
    this.newSlotDate.set(this.dateFilter()); // Default to current filter date
    this.newSlotStartTime.set('');
    this.newSlotEndTime.set('');
    this.errorMessage.set('');
    this.showAddSlotModal.set(true);
  }

  closeAddSlotModal(): void {
    this.showAddSlotModal.set(false);
    this.selectedDoctor.set(null);
    this.errorMessage.set('');
  }

  confirmAddSlot(): void {
    const doc = this.selectedDoctor();
    const date = this.newSlotDate();
    const start = this.newSlotStartTime();
    const end = this.newSlotEndTime();

    this.errorMessage.set('');

    if (!doc || !date || !start || !end) {
      this.errorMessage.set('Please fill in all fields.');
      return;
    }

    if (start >= end) {
      this.errorMessage.set('Start time must be before end time.');
      return;
    }

    const slot = {
      startTime: start,
      endTime: end,
      status: 'available'
    };

    this.receptionistService.addDoctorSlot(doc.id, date, slot).subscribe({
      next: () => {
        this.loadAvailability();
        this.closeAddSlotModal();
      },
      error: (err) => {
        console.error('Failed to add slot', err);
        this.errorMessage.set('Failed to add slot. Please try again.');
      }
    });
  }

  getAvailableCount(slots: any[]): number {
    return (slots || []).filter(s => s.status === 'available').length;
  }

  getFirstAvailable(slots: any[]): any {
    return (slots || []).find(s => s.status === 'available');
  }
}

