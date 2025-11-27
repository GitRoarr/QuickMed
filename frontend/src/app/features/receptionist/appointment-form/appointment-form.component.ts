import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceptionistService } from '@app/core/services/receptionist.service';
import { AppointmentService } from '@app/core/services/appointment.service';

@Component({
  selector: 'app-receptionist-appointment-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.css'],
})
export class AppointmentFormComponent {
  private readonly receptionistService = inject(ReceptionistService);

  model = signal<any>({ patientId: '', doctorId: '', appointmentDate: '', appointmentTime: '', notes: '' });
  isSaving = signal(false);

  save(): void {
    const payload = this.model();
    if (!payload.patientId || !payload.doctorId || !payload.appointmentDate || !payload.appointmentTime) return;
    this.isSaving.set(true);
    this.receptionistService.createAppointment(payload).subscribe({ next: () => { this.isSaving.set(false); this.model.set({ patientId: '', doctorId: '', appointmentDate: '', appointmentTime: '', notes: '' }) }, error: () => this.isSaving.set(false) });
  }
}
