import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, DoctorInvitationResponse } from '@app/core/services/admin.service';
import { ToastService } from '@app/core/services/toast.service';

@Component({
  selector: 'app-admin-doctor-add',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-doctor-add.component.html',
  styleUrls: ['./admin-doctor-add.component.scss']
})
export class AdminDoctorAddComponent {
  form: FormGroup;
  loading = false;
  inviteLink: string | null = null;
  emailSent = false;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      specialty: ['', Validators.required],
      licenseNumber: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      bio: ['']
    });
  }

  submit() {
    if (this.form.invalid) {
      this.toastService.error('Please fill in all required fields');
      return;
    }

    this.loading = true;
    this.inviteLink = null;
    this.emailSent = false;

    this.adminService.createDoctorInvitation(this.form.value).subscribe({
      next: (response: DoctorInvitationResponse) => {
        this.emailSent = response.emailSent;
        this.inviteLink = response.inviteLink || null;

        if (response.emailSent) {
          this.toastService.success('Doctor invited successfully!');
          // Auto-navigate back after 2 seconds if email was sent
          setTimeout(() => {
            this.back();
          }, 2000);
        } else {
          this.toastService.warning('Manual link generated. Please copy it before leaving.');
        }

        this.loading = false;
        this.form.reset();

        // Auto-hide the invitation link card after 10 seconds if they don't navigate away
        if (this.inviteLink) {
          setTimeout(() => {
            this.inviteLink = null;
          }, 10000);
        }
      },
      error: (err) => {
        const errMsg = err.error?.message || 'Failed to invite doctor.';
        this.toastService.error(errMsg);
        this.loading = false;
        console.error('Error inviting doctor:', err);
      }
    });
  }

  back() { this.router.navigate(['/admin/doctors']); }

  copyInviteLink() {
    if (!this.inviteLink) return;
    navigator.clipboard.writeText(this.inviteLink);
    this.toastService.success('Invite link copied to clipboard!');
  }
}
