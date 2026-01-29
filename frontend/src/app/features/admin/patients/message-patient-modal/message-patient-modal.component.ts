import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-message-patient-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './message-patient-modal.component.html',
    styleUrls: ['./message-patient-modal.component.scss']
})
export class MessagePatientModalComponent {
    @Input() patientName!: string;
    @Output() close = new EventEmitter<void>();
    @Output() send = new EventEmitter<{ subject: string, message: string }>();

    subject = '';
    messageBody = '';
    isSending = false;

    onClose() {
        this.close.emit();
    }

    onSend() {
        if (!this.subject || !this.messageBody) return;

        this.isSending = true;
        this.send.emit({
            subject: this.subject,
            message: this.messageBody
        });
    }
}
