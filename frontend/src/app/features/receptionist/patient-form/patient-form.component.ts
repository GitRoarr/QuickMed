import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';

@Component({
  selector: 'app-receptionist-patient-form',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertMessageComponent],
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.css'],
})
export class PatientFormComponent implements OnInit {
  private readonly receptionistService = inject(ReceptionistService);
  private readonly destroyRef = inject(DestroyRef);

  model = signal<any>({ firstName: '', lastName: '', email: '', phoneNumber: '', dateOfBirth: '', medicalHistory: '' });
  isSaving = signal(false);
  message = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  ngOnInit(): void {}

  save(): void {
    const payload = { ...this.model() };
    if (!payload.firstName || !payload.lastName || !payload.email) {
      this.message.set({ type: 'error', text: 'First name, last name and email are required.' });
      return;
    }
    this.isSaving.set(true);
    this.receptionistService.createPatient(payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.message.set({ type: 'success', text: 'Patient created. Temporary password was sent.' });
        this.model.set({ firstName: '', lastName: '', email: '', phoneNumber: '', dateOfBirth: '', medicalHistory: '' });
      },
      error: (err) => {
        this.isSaving.set(false);
        this.message.set({ type: 'error', text: err.error?.message || 'Failed to create patient' });
      },
    });
  }
}
