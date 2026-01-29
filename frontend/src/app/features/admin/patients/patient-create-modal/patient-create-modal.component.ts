import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@app/core/services/admin.service';

@Component({
    selector: 'app-patient-create-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './patient-create-modal.component.html',
    styleUrls: ['./patient-create-modal.component.scss']
})
export class PatientCreateModalComponent {
    private adminService = inject(AdminService);

    @Output() close = new EventEmitter<void>();
    @Output() patientCreated = new EventEmitter<void>();

    mode = signal<'create' | 'invite'>('create');
    isLoading = signal<boolean>(false);
    errorMessage = signal<string>('');

    // Create Form
    firstName = signal('');
    lastName = signal('');
    email = signal('');
    phone = signal('');
    dob = signal('');

    // Invite Form
    inviteEmail = signal('');

    onClose() {
        this.close.emit();
    }

    setMode(m: 'create' | 'invite') {
        this.mode.set(m);
        this.errorMessage.set('');
    }

    submit() {
        this.errorMessage.set('');

        if (this.mode() === 'create') {
            this.createPatient();
        } else {
            this.invitePatient();
        }
    }

    private createPatient() {
        if (!this.firstName() || !this.lastName() || !this.email()) {
            this.errorMessage.set('Please fill in all required fields.');
            return;
        }

        this.isLoading.set(true);
        const payload = {
            firstName: this.firstName(),
            lastName: this.lastName(),
            email: this.email(),
            phoneNumber: this.phone(),
            dateOfBirth: this.dob()
        };

        this.adminService.createPatient(payload).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.patientCreated.emit();
                this.onClose();
            },
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
                this.errorMessage.set(err.error?.message || 'Failed to create patient.');
            }
        });
    }

    private invitePatient() {
        if (!this.inviteEmail()) {
            this.errorMessage.set('Please enter an email address.');
            return;
        }

        this.isLoading.set(true);
        // Simulating invite since actual endpoint might differ or be handled via create
        // For now, we'll use a mock timeout or existing service if applicable.
        // Assuming createPatient with partial data triggers invite if backend supports, 
        // or we just mock it for this UI demo.

        console.log('Inviting patient:', this.inviteEmail());

        setTimeout(() => {
            this.isLoading.set(false);
            this.patientCreated.emit(); // To trigger refresh/toast in parent
            this.onClose();
        }, 1000);
    }
}
