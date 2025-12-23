import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PatientShellComponent } from '../shared/patient-shell/patient-shell.component';
import { AuthService } from '@core/services/auth.service';
import { UserService } from '@core/services/user.service';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PatientShellComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);

  user = signal(this.authService.currentUser());
  saving = signal(false);

  profileForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phoneNumber: [''],
    bloodType: [''],
    allergies: [''],
    bloodPressureSystolic: [null as number | null],
    bloodPressureDiastolic: [null as number | null],
    heartRate: [null as number | null],
    bmi: [null as number | null],
    lastCheckupDate: [''],
  });

  ngOnInit(): void {
    const current = this.authService.currentUser();
    if (current?.id) {
      this.userService.getOne(current.id).subscribe({
        next: (u) => {
          this.user.set(u);
          this.authService.setUser(u);
          this.patchForm(u);
        },
      });
      this.patchForm(current);
    }
  }

  private patchForm(u: any) {
    this.profileForm.patchValue({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      phoneNumber: u.phoneNumber || '',
      bloodType: u.bloodType || '',
      allergies: Array.isArray(u.allergies) ? u.allergies.join(', ') : u.allergies || '',
      bloodPressureSystolic: u.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: u.bloodPressureDiastolic ?? null,
      heartRate: u.heartRate ?? null,
      bmi: u.bmi ?? null,
      lastCheckupDate: u.lastCheckupDate ? u.lastCheckupDate.substring(0, 10) : '',
    });
  }

  saveProfile(): void {
    if (!this.user()?.id || this.profileForm.invalid) return;
    const allergiesRaw = this.profileForm.value.allergies || '';
    const payload: any = {
      firstName: this.profileForm.value.firstName,
      lastName: this.profileForm.value.lastName,
      phoneNumber: this.profileForm.value.phoneNumber,
      bloodType: this.profileForm.value.bloodType,
      allergies: allergiesRaw
        ? (allergiesRaw as string)
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
        : [],
      bloodPressureSystolic: this.toNumber(this.profileForm.value.bloodPressureSystolic),
      bloodPressureDiastolic: this.toNumber(this.profileForm.value.bloodPressureDiastolic),
      heartRate: this.toNumber(this.profileForm.value.heartRate),
      bmi: this.toNumber(this.profileForm.value.bmi, true),
      lastCheckupDate: this.profileForm.value.lastCheckupDate || null,
    };

    this.saving.set(true);
    this.userService.update(this.user()!.id, payload).subscribe({
      next: (updated) => {
        this.user.set(updated);
        this.authService.setUser(updated);
        this.patchForm(updated);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  private toNumber(value: any, allowFloat = false): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = allowFloat ? parseFloat(value) : parseInt(value, 10);
    return Number.isFinite(num) ? num : null;
  }
}

