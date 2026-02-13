import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientShellComponent } from '../shared/patient-shell/patient-shell.component';
import { AuthService } from '@core/services/auth.service';
import { UserService } from '@core/services/user.service';
import { NotificationService } from '@core/services/notification.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-patient-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PatientShellComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  activeTab = signal<'profile' | 'notifications' | 'security' | 'privacy'>('profile');
  isSaving = signal(false);
  showPass = false;

  profileForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
    phoneNumber: [''],
  });

  notificationsForm = this.fb.group({
    email: [true],
    sms: [true],
    push: [true],
    marketing: [false],
  });

  passwordForm = this.fb.group({
    currentPassword: [''],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  privacyPrefs = signal({
    shareActivity: true,
    shareAnalytics: false,
    personalizedTips: true,
  });

  get user() {
    return this.authService.currentUser();
  }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        phoneNumber: user.phoneNumber || '',
      });

      this.privacyPrefs.set({
        shareActivity: user.shareActivity ?? true,
        shareAnalytics: user.shareAnalytics ?? false,
        personalizedTips: user.personalizedTips ?? true,
      });
    }

    this.notificationService.getNotificationPreferences().subscribe({
      next: (prefs) => {
        this.notificationsForm.patchValue({
          email: prefs.emailNotifications ?? true,
          sms: prefs.smsNotifications ?? true,
          push: prefs.pushNotifications ?? true,
          marketing: prefs.marketingEmails ?? false,
        });
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    const user = this.authService.currentUser();
    if (!user) return;

    this.isSaving.set(true);
    this.userService
      .update(user.id, {
        firstName: this.profileForm.getRawValue().firstName || user.firstName,
        lastName: this.profileForm.getRawValue().lastName || user.lastName,
        phoneNumber: this.profileForm.getRawValue().phoneNumber ?? user.phoneNumber,
      })
      .subscribe({
        next: (updated) => {
          this.authService.setUser(updated);
          this.toast.success('Profile updated successfully');
          this.isSaving.set(false);
        },
        error: () => {
          this.toast.error('Failed to update profile');
          this.isSaving.set(false);
        },
      });
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const user = this.authService.currentUser();
    if (!user) return;

    this.isSaving.set(true);
    this.userService.updateAvatar(user.id, file).subscribe({
      next: (updated) => {
        this.authService.setUser(updated);
        this.toast.success('Avatar updated successfully');
        this.isSaving.set(false);
      },
      error: () => {
        this.toast.error('Failed to upload avatar');
        this.isSaving.set(false);
      },
    });
  }

  saveNotifications(): void {
    this.isSaving.set(true);
    const value = this.notificationsForm.value;
    this.notificationService
      .updateNotificationPreferences({
        emailNotifications: value.email ?? true,
        smsNotifications: value.sms ?? true,
        pushNotifications: value.push ?? true,
        marketingEmails: value.marketing ?? false,
      } as any)
      .subscribe({
        next: () => {
          this.toast.success('Preferences saved');
          this.isSaving.set(false);
        },
        error: () => {
          this.toast.error('Failed to save settings');
          this.isSaving.set(false);
        },
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    const user = this.authService.currentUser();
    if (!user) return;

    this.isSaving.set(true);
    this.userService
      .changePassword(user.id, this.passwordForm.value as any)
      .subscribe({
        next: () => {
          this.passwordForm.reset();
          this.toast.success('Password updated successfully');
          this.isSaving.set(false);
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to update password');
          this.isSaving.set(false);
        },
      });
  }

  updatePrivacy(key: keyof ReturnType<typeof this.privacyPrefs>, value: boolean): void {
    const user = this.authService.currentUser();
    if (!user) return;

    // Update locally first for snappy UI
    this.privacyPrefs.update(prev => ({ ...prev, [key]: value }));

    this.userService.update(user.id, { [key]: value }).subscribe({
      next: (updated) => {
        this.authService.setUser(updated);
      },
      error: () => {
        this.toast.error('Failed to update privacy setting');
        // Revert on error
        this.privacyPrefs.update(prev => ({ ...prev, [key]: !value }));
      }
    });
  }
}
