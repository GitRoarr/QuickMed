import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

// Define the interface locally or import it if shared. 
// Since it's local to patients.component.ts, we might need to export it from there 
// or just define a compatible structure here for simplicity.
export interface PatientRow {
    id: string
    initials: string
    fullName: string
    ageLabel: string
    genderLabel: string
    condition: string
    lastVisit: string
    patientId: string
    nextAppointment: string
    status: "active" | "pending"
    email: string
    phone?: string
    raw: any // keeping it flexible 
}

@Component({
    selector: 'app-patient-detail-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './patient-detail-modal.component.html',
    styleUrls: ['./patient-detail-modal.component.scss']
})
export class PatientDetailModalComponent {
    @Input() patient!: PatientRow;
    @Output() close = new EventEmitter<void>();
    @Output() message = new EventEmitter<void>();
    @Output() schedule = new EventEmitter<void>();

    onClose() {
        this.close.emit();
    }

    onMessage() {
        this.message.emit();
    }

    onSchedule() {
        this.schedule.emit();
    }
}
