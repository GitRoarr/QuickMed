import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DoctorOverviewCard, User } from '@app/core/services/admin.service';

@Component({
    selector: 'app-doctor-detail-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './doctor-detail-modal.component.html',
    styleUrls: ['./doctor-detail-modal.component.scss']
})
export class DoctorDetailModalComponent {
    @Input() doctor!: DoctorOverviewCard;
    @Output() close = new EventEmitter<void>();

    onClose() {
        this.close.emit();
    }

    getInitials(doc: DoctorOverviewCard) {
        return `${(doc.firstName[0] || "")}${(doc.lastName[0] || "")}`.toUpperCase();
    }

    // Helper to format available days nicely
    get formattedDays(): string {
        if (!this.doctor.availableDays || this.doctor.availableDays.length === 0) {
            return 'No specific days set';
        }
        return this.doctor.availableDays.join(', ');
    }
}
