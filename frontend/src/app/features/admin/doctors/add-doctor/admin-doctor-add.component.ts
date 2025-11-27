import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, DoctorInvitationResponse } from '@app/core/services/admin.service';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';

@Component({
  selector: 'app-admin-doctor-add',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AlertMessageComponent],
  templateUrl: './admin-doctor-add.component.html',
  styleUrls: ['./admin-doctor-add.component.scss']
})
export class AdminDoctorAddComponent {
  form: FormGroup;
  message: string = '';
  type: 'success' | 'error' | '' = '';
  loading = false;
  inviteLink: string | null = null;
  emailSent = false;

  constructor(private fb: FormBuilder, private adminService: AdminService, private router: Router) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      specialty: ['', Validators.required],
      licenseNumber: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      bio: ['', Validators.required]
    });
  }

  submit() {
    if (this.form.invalid) {
      this.message = 'Please fill in all required fields';
      this.type = 'error';
      return;
    }

    this.loading = true;
    this.message = '';
    this.type = '';
    this.inviteLink = null;
    this.emailSent = false;

    this.adminService.createDoctorInvitation(this.form.value).subscribe({
      next: (response: DoctorInvitationResponse) => {
        this.type = 'success';
        this.emailSent = response.emailSent;
        this.inviteLink = response.inviteLink || null;
        this.message = response.emailSent
          ? 'Doctor invited successfully! An invitation email has been sent.'
          : 'Email service is not configured. Share the invite link below manually.';
        this.loading = false;
        this.form.reset();
      },
      error: (err) => {
        this.type = 'error';
        this.message = err.error?.message || 'Failed to invite doctor. Please try again.';
        this.loading = false;
        console.error('Error inviting doctor:', err);
      }
    });
  }

  back() { this.router.navigate(['/admin/doctors']); }

  copyInviteLink() {
    if (!this.inviteLink) return;
    navigator.clipboard.writeText(this.inviteLink);
    this.message = 'Invite link copied to clipboard!';
    this.type = 'success';
  }
}
