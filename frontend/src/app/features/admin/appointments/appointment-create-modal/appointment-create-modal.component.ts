import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, User, DoctorOverviewCard } from '@app/core/services/admin.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-appointment-create-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './appointment-create-modal.component.html',
    styleUrls: ['./appointment-create-modal.component.scss']
})
export class AppointmentCreateModalComponent {
    private adminService = inject(AdminService);

    @Input() preselectedPatientId?: string;
    @Input() preselectedDoctorId?: string;
    @Output() close = new EventEmitter<void>();
    @Output() appointmentCreated = new EventEmitter<void>();

    // Form Data
    selectedPatient = signal<User | null>(null);
    selectedDoctor = signal<DoctorOverviewCard | null>(null);
    date = signal<string>(new Date().toISOString().split('T')[0]);
    time = signal<string>('');
    type = signal<string>('Consultation');
    status = signal<string>('pending');
    reason = signal<string>('');

    // Search States
    patientSearchTerm = signal<string>('');
    doctorSearchTerm = signal<string>('');

    patientSearchResults = signal<User[]>([]);
    doctorSearchResults = signal<DoctorOverviewCard[]>([]);

    showPatientDropdown = signal<boolean>(false);
    showDoctorDropdown = signal<boolean>(false);

    // Slot Logic
    suggestedSlots = signal<string[]>([]);
    isLoadingSlots = signal<boolean>(false);
    isSubmitting = signal<boolean>(false);

    private patientSearch$ = new Subject<string>();
    private doctorSearch$ = new Subject<string>();

    constructor() {
        // Patient Search Listener
        this.patientSearch$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(term => {
                if (!term) return of([]);
                return this.adminService.getPatients(1, 5, term).pipe(
                    // map response to data array
                    switchMap(res => of(res.data))
                );
            }),
            takeUntilDestroyed()
        ).subscribe(users => {
            this.patientSearchResults.set(users);
            this.showPatientDropdown.set(true);
        });

        // Doctor Search Listener
        this.doctorSearch$.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(term => {
                if (!term) return of([]);
                return this.adminService.getDoctorOverview({ search: term }).pipe(
                    switchMap(res => of(res.doctors))
                );
            }),
            takeUntilDestroyed()
        ).subscribe(doctors => {
            this.doctorSearchResults.set(doctors);
            this.showDoctorDropdown.set(true);
        });
    }

    ngOnInit() {
        if (this.preselectedPatientId) {
            this.adminService.getUserById(this.preselectedPatientId).subscribe(u => {
                this.selectPatient(u);
            });
        }
        // Mock slots initially
        this.updateSlots();
    }

    // Search Handlers
    onPatientSearch(event: Event) {
        const term = (event.target as HTMLInputElement).value;
        this.patientSearchTerm.set(term);
        this.patientSearch$.next(term);
    }

    onDoctorSearch(event: Event) {
        const term = (event.target as HTMLInputElement).value;
        this.doctorSearchTerm.set(term);
        this.doctorSearch$.next(term);
    }

    selectPatient(user: User) {
        this.selectedPatient.set(user);
        this.patientSearchTerm.set(`${user.firstName} ${user.lastName}`);
        this.showPatientDropdown.set(false);
    }

    selectDoctor(doc: DoctorOverviewCard) {
        this.selectedDoctor.set(doc);
        this.doctorSearchTerm.set(`${doc.firstName} ${doc.lastName}`);
        this.showDoctorDropdown.set(false);
        this.updateSlots();
    }

    // Slot Logic
    updateSlots() {
        if (!this.selectedDoctor() || !this.date()) return;

        this.isLoadingSlots.set(true);
        this.suggestedSlots.set([]);

        this.adminService.getDoctorSchedule(this.selectedDoctor()!.id, this.date()).subscribe({
            next: (res) => {
                const availableTimes = (res.slots || [])
                    .filter(s => s.status === 'available')
                    .map(s => this.formatTime(s.startTime));

                this.suggestedSlots.set(availableTimes);
                this.isLoadingSlots.set(false);
            },
            error: (err) => {
                console.error('Failed to load slots', err);
                this.isLoadingSlots.set(false);
            }
        });
    }

    private formatTime(time: string): string {
        const [h, m] = time.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    selectSlot(slot: string) {
        this.time.set(slot);
    }

    // Actions
    onClose() {
        this.close.emit();
    }

    onSubmit() {
        if (!this.selectedPatient() || !this.selectedDoctor() || !this.date() || !this.time()) return;

        this.isSubmitting.set(true);

        const payload = {
            patientId: this.selectedPatient()!.id,
            doctorId: this.selectedDoctor()!.id,
            appointmentDate: this.date(),
            appointmentTime: this.time(),
            appointmentType: this.type(),
            status: 'pending', // Admins usually create confirmed, but following mockup
            reason: this.reason(),
            isVideoConsultation: false // Default
        };

        console.log('Creating Appointment:', payload);

        this.adminService.createAppointment(payload as any).subscribe({
            next: () => {
                this.isSubmitting.set(false);
                this.appointmentCreated.emit();
                this.onClose();
            },
            error: (err) => {
                console.error(err);
                this.isSubmitting.set(false);
                // Ideally show toast here
            }
        });
    }
}
