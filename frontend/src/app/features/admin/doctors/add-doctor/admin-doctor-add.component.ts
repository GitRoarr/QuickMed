import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '@app/core/services/admin.service';

@Component({
  selector: 'app-admin-doctor-add',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-doctor-add.component.html',
  styleUrls: ['./admin-doctor-add.component.scss']
})
export class AdminDoctorAddComponent {
  form: FormGroup;
  message: string = '';
  type: 'success' | 'error' | '' = '';

  constructor(private fb: FormBuilder, private adminService: AdminService, private router: Router) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      specialty: ['', Validators.required],
      licenseNumber: ['', Validators.required],
      phoneNumber: ['']
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.adminService.createUser({ ...this.form.value, role: 'doctor' }).subscribe({
      next: () => { this.type = 'success'; this.message = 'Doctor invited successfully!'; this.form.reset(); },
      error: () => { this.type = 'error'; this.message = 'Failed to invite doctor.'; }
    });
  }

  back() { this.router.navigate(['/admin/doctors']); }
}
