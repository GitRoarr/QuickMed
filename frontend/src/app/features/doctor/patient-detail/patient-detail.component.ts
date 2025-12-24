import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '@core/services/user.service';
import { ToastService } from '@core/services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-doctor-patient-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.css'],
})
export class PatientDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  private formSub?: Subscription;

  patientId = signal<string | null>(null);
  patient = signal<any>(null);
  loading = signal(true);
  saving = signal(false);

  bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  form = this.fb.group({
    bloodType: [''],
    allergiesText: [''],
    bloodPressureSystolic: [null as number | null, [Validators.min(40), Validators.max(260)]],
    bloodPressureDiastolic: [null as number | null, [Validators.min(30), Validators.max(180)]],
    heartRate: [null as number | null, [Validators.min(30), Validators.max(230)]],
    heightCm: [null as number | null, [Validators.min(50), Validators.max(260)]],
    weightKg: [null as number | null, [Validators.min(2), Validators.max(500)]],
    bmi: [{ value: null as number | null, disabled: true }],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.toast.error('Missing patient id');
      this.router.navigate(['/doctor/patients']);
      return;
    }
    this.patientId.set(id);
    this.loadPatient(id);
    this.watchVitals();
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
  }

  loadPatient(id: string): void {
    this.loading.set(true);
    this.userService.getOne(id).subscribe({
      next: (u) => {
        this.patient.set(u);
        this.patchForm(u);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Unable to load patient');
        this.router.navigate(['/doctor/patients']);
      },
    });
  }

  private patchForm(u: any): void {
    this.form.patchValue({
      bloodType: u.bloodType || '',
      allergiesText: Array.isArray(u.allergies) ? u.allergies.join(', ') : u.allergies || '',
      bloodPressureSystolic: u.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: u.bloodPressureDiastolic ?? null,
      heartRate: u.heartRate ?? null,
      heightCm: u.heightCm ?? null,
      weightKg: u.weightKg ?? null,
      bmi: u.bmi ?? null,
    }, { emitEvent: false });
  }

  private watchVitals(): void {
    this.formSub = this.form.valueChanges.subscribe((val) => {
      const h = Number(val.heightCm);
      const w = Number(val.weightKg);
      if (Number.isFinite(h) && h > 0 && Number.isFinite(w) && w > 0) {
        const bmi = w / Math.pow(h / 100, 2);
        const rounded = Math.round(bmi * 10) / 10;
        this.form.get('bmi')?.setValue(rounded, { emitEvent: false });
      }
    });
  }

  getAllergyList(): string[] {
    const raw = this.form.value.allergiesText || '';
    return raw
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
  }

  save(): void {
    if (!this.patientId() || this.form.invalid) return;

    const payload: any = {
      bloodType: this.form.value.bloodType || '',
      allergies: this.getAllergyList(),
      bloodPressureSystolic: this.toNumber(this.form.value.bloodPressureSystolic),
      bloodPressureDiastolic: this.toNumber(this.form.value.bloodPressureDiastolic),
      heartRate: this.toNumber(this.form.value.heartRate),
      heightCm: this.toNumber(this.form.value.heightCm, true),
      weightKg: this.toNumber(this.form.value.weightKg, true),
      bmi: this.toNumber(this.form.getRawValue().bmi, true),
    };

    this.saving.set(true);
    this.userService.update(this.patientId()!, payload).subscribe({
      next: (updated) => {
        this.patient.set(updated);
        this.patchForm(updated);
        this.saving.set(false);
        this.toast.success('Patient info updated', { title: 'Patient' });
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Failed to update patient', { title: 'Patient' });
      },
    });
  }

  private toNumber(value: any, allowFloat = false): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = allowFloat ? parseFloat(value) : parseInt(value, 10);
    return Number.isFinite(num) ? num : null;
  }

  getPatientName(): string {
    const p = this.patient();
    return p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient' : 'Patient';
  }

  getPatientEmail(): string {
    return this.patient()?.email || '—';
  }

  getPatientIdLabel(): string {
    const p = this.patient();
    return p?.patientId || p?.id || '';
  }

  goBack(): void {
    this.router.navigate(['/doctor/patients']);
  }
}
