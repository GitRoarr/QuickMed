import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientShellComponent } from '../shared/patient-shell/patient-shell.component';
import { AuthService } from '@core/services/auth.service';
import { UserService } from '@core/services/user.service';
import { NotificationService } from '@core/services/notification.service';

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

  activeTab = signal<'profile' | 'notifications' | 'security' | 'privacy'>('profile');
  statusMessage = signal<string | null>(null);
  statusTone = signal<'success' | 'error'>('success');

  profileForm = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
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

  privacyPreferences = signal({
    shareActivity: true,
    shareAnalytics: false,
    personalizedTips: true,
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.profileForm.patchValue({
        fullName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        email: user.email,
        phoneNumber: user.phoneNumber || '',
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

    const fullName = this.profileForm.value.fullName ?? '';
    const [firstName, ...rest] = fullName.split(' ');
    const lastName = rest.join(' ') || user.lastName;

    this.userService
      .update(user.id, {
        firstName: firstName || user.firstName,
        lastName,
        email: this.profileForm.value.email ?? user.email,
        phoneNumber: this.profileForm.value.phoneNumber ?? user.phoneNumber,
      })
      .subscribe({
        next: (updated) => {
          this.authService.setUser(updated);
          this.setStatus('Profile updated successfully', 'success');
        },
        error: () => this.setStatus('Failed to update profile', 'error'),
      });
  }

  saveNotifications(): void {
    const value = this.notificationsForm.value;
    this.notificationService
      .updateNotificationPreferences({
        emailNotifications: value.email ?? true,
        smsNotifications: value.sms ?? true,
        pushNotifications: value.push ?? true,
        marketingEmails: value.marketing ?? false,
      } as any)
      .subscribe({
        next: () => this.setStatus('Notification preferences saved', 'success'),
        error: () => this.setStatus('Failed to save notification settings', 'error'),
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    const user = this.authService.currentUser();
    if (!user) return;

    this.userService
      .changePassword(user.id, this.passwordForm.value as any)
      .subscribe({
        next: () => {
          this.passwordForm.reset();
          this.setStatus('Password updated', 'success');
        },
        error: () => this.setStatus('Failed to update password', 'error'),
      });
  }

  setPrivacyPreference(key: keyof ReturnType<typeof this.privacyPreferences>, value: boolean): void {
    this.privacyPreferences.update((prefs) => ({ ...prefs, [key]: value }));
  }

  private setStatus(message: string, tone: 'success' | 'error'): void {
    this.statusMessage.set(message);
    this.statusTone.set(tone);
    setTimeout(() => this.statusMessage.set(null), 3000);
  }
}

