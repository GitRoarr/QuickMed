import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, DoctorInvitationResponse } from '@app/core/services/admin.service';
import { ToastService } from '@app/core/services/toast.service';

import { ThemeService } from '@app/core/services/theme.service';

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
    private toastService: ToastService,
    public themeService: ThemeService
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
          this.toastService.success('Doctor invited successfully! Link is available below.');
          // We don't auto-navigate if the admin might want to see/copy the link
        } else {
          this.toastService.warning('Manual link generated. please share it with the doctor.');
        }

        this.loading = false;
        this.form.reset();

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

  viewInviteLink() {
    if (!this.inviteLink) return;
    window.open(this.inviteLink, '_blank');
    this.toastService.info('Viewing invitation link...');
  }
}
