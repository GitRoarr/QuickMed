import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PrescriptionService, CreatePrescriptionDto } from '@core/services/prescription.service';
import { DoctorService, DoctorPatientSummary } from '@core/services/doctor.service';
import { ToastService } from '@core/services/toast.service';
import { DoctorHeaderComponent } from '../../shared/doctor-header/doctor-header.component';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
    selector: 'app-create-prescription',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, DoctorHeaderComponent],
    templateUrl: './create-prescription.component.html',
    styleUrls: ['./create-prescription.component.css']
})
export class CreatePrescriptionComponent implements OnInit {
    private router = inject(Router);
    private location = inject(Location);
    private prescriptionService = inject(PrescriptionService);
    private doctorService = inject(DoctorService);
    private toast = inject(ToastService);
    private auth = inject(AuthService);
    private notify = inject(NotificationService);

    currentUser = signal<any>(null);
    unreadNotificationCount = signal(0);

    isSubmitting = signal(false);
    isLoadingPatients = signal(false);
    patients = signal<DoctorPatientSummary[]>([]);

    newPrescription: CreatePrescriptionDto = {
        medication: '',
        dosage: '',
        patientId: '',
        frequency: '',
        duration: '',
        prescriptionDate: new Date().toISOString().split('T')[0],
        notes: '',
        instructions: '',
        status: 'active',
    };

    frequencyOptions = [
        'Once daily',
        'Twice daily',
        'Three times daily',
        'Four times daily',
        'Every 4 hours',
        'Every 6 hours',
        'Every 8 hours',
        'Every 12 hours',
        'Once weekly',
        'As needed (PRN)',
        'Before meals',
        'After meals',
        'At bedtime',
    ];

    durationOptions = [
        '3 days',
        '5 days',
        '7 days',
        '10 days',
        '14 days',
        '21 days',
        '30 days',
        '60 days',
        '90 days',
        '6 months',
        '1 year',
        'Ongoing',
    ];

    ngOnInit(): void {
        this.currentUser.set(this.auth.currentUser());
        this.loadNotifications();
        this.loadPatients();
    }

    loadNotifications() {
        this.notify.getUnreadCount().subscribe(c => this.unreadNotificationCount.set(c || 0));
    }

    loadPatients() {
        this.isLoadingPatients.set(true);
        this.doctorService.getPatients(1, 200).subscribe({
            next: (res) => {
                this.patients.set(res.patients || []);
                this.isLoadingPatients.set(false);
            },
            error: () => {
                this.toast.error('Failed to load patients');
                this.isLoadingPatients.set(false);
            }
        });
    }

    onSubmit(): void {
        if (!this.checkValidity()) return;

        this.isSubmitting.set(true);
        this.prescriptionService.create(this.newPrescription).subscribe({
            next: () => {
                this.toast.success('Prescription created successfully');
                this.isSubmitting.set(false);
                this.router.navigate(['/doctor/prescriptions']);
            },
            error: (err) => {
                console.error(err);
                this.toast.error('Failed to create prescription');
                this.isSubmitting.set(false);
            }
        });
    }

    checkValidity(): boolean {
        if (!this.newPrescription.patientId) {
            this.toast.error('Please select a patient');
            return false;
        }
        if (!this.newPrescription.medication) {
            this.toast.error('Please enter medication name');
            return false;
        }
        if (!this.newPrescription.dosage) {
            this.toast.error('Please enter dosage');
            return false;
        }
        if (!this.newPrescription.frequency) {
            this.toast.error('Please select frequency');
            return false;
        }
        if (!this.newPrescription.duration) {
            this.toast.error('Please select duration');
            return false;
        }
        return true;
    }

    cancel(): void {
        this.location.back();
    }

    getDoctorInitials(): string {
        const u = this.currentUser();
        return u ? (u.firstName[0] + u.lastName[0]).toUpperCase() : 'DR';
    }
}
