import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConsultationService, TreatmentType } from '../../../core/services/consultation.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-consultation-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './consultation-form.component.html',
  styleUrls: ['./consultation-form.component.css']
})
export class ConsultationFormComponent implements OnInit {
  consultationForm!: FormGroup;
  appointmentId!: string;
  treatmentTypes = Object.values(TreatmentType);

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private consultationService = inject(ConsultationService);

  ngOnInit(): void {
    this.appointmentId = this.route.snapshot.paramMap.get('appointmentId')!;
    this.consultationForm = this.fb.group({
      notes: ['', Validators.required],
      treatments: this.fb.array([])
    });
  }

  get treatments(): FormArray {
    return this.consultationForm.get('treatments') as FormArray;
  }

  newTreatment(): FormGroup {
    return this.fb.group({
      type: [TreatmentType.MEDICATION, Validators.required],
      details: ['', Validators.required],
      instructions: ['']
    });
  }

  addTreatment() {
    this.treatments.push(this.newTreatment());
  }

  removeTreatment(index: number) {
    this.treatments.removeAt(index);
  }

  onSubmit() {
    if (this.consultationForm.valid) {
      const consultationData = {
        ...this.consultationForm.value,
        appointmentId: this.appointmentId
      };
      this.consultationService.create(consultationData).subscribe(() => {
        // TODO: Add success message
        this.router.navigate(['/doctor/appointments']);
      });
    }
  }
}
