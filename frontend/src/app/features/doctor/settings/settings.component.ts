import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { AuthService } from '@core/services/auth.service';
import { SettingsService, DoctorSettings } from '@core/services/settings.service';
import { NotificationService } from '@core/services/notification.service';
import { ThemeService } from '@core/services/theme.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-doctor-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DoctorHeaderComponent
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  private notificationService = inject(NotificationService);
  private toast = inject(ToastService);
  themeService = inject(ThemeService);

  currentUser = signal<any>(null);
  settings = signal<DoctorSettings | null>(null);
  isLoading = signal(true);
  isSaving = signal(false);
  activeTab = signal<'profile' | 'availability' | 'billing' | 'privacy'>('profile');
  unreadNotificationCount = signal(0);

  tabs = [
    { label: 'Profile', value: 'profile' as const, icon: 'bi-person-circle' },
    { label: 'Availability', value: 'availability' as const, icon: 'bi-calendar-check' },
    { label: 'Billing', value: 'billing' as const, icon: 'bi-credit-card' },
    { label: 'Security', value: 'privacy' as const, icon: 'bi-shield-lock' },
  ] as const;

  daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  profileForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialty: '',
    licenseNumber: '',
  };

  availabilitySettings = {
    availableDays: [] as string[],
    startTime: '09:00',
    endTime: '17:00',
  };

  billingSettings = {
    consultationFee: 0,
    paymentMethod: 'bank',
  };

  privacySettings = {
    twoFactorAuth: false,
    shareDataWithPatients: true,
  };

  ngOnInit(): void {
    this.loadUserData();
    this.loadSettings();
    this.loadUnreadNotifications();
  }

  loadUserData(): void {
    this.currentUser.set(this.authService.currentUser());
    if (this.currentUser()) {
      this.profileForm = {
        firstName: this.currentUser().firstName || '',
        lastName: this.currentUser().lastName || '',
        email: this.currentUser().email || '',
        phone: this.currentUser().phone || '',
        specialty: this.currentUser().specialty || '',
        licenseNumber: this.currentUser().licenseNumber || '',
      };
    }
  }

  loadSettings(): void {
    this.isLoading.set(true);
    this.settingsService.getSettings().subscribe({
      next: (data) => {
        this.settings.set(data);
        this.availabilitySettings = {
          availableDays: data.availableDays || [],
          startTime: data.startTime || '09:00',
          endTime: data.endTime || '17:00',
        };
        this.billingSettings = {
          consultationFee: data.consultationFee || 0,
          paymentMethod: data.paymentMethod || 'bank',
        };
        this.privacySettings = {
          twoFactorAuth: !!data.twoFactorAuth,
          shareDataWithPatients: !!data.shareDataWithPatients,
        };
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load settings', { title: 'Settings' });
        this.isLoading.set(false);
      }
    });
  }

  loadUnreadNotifications(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotificationCount.set(count || 0)
    });
  }

  toggleDay(day: string): void {
    const days = [...this.availabilitySettings.availableDays];
    const index = days.indexOf(day);
    if (index > -1) {
      days.splice(index, 1);
    } else {
      days.push(day);
    }
    this.availabilitySettings.availableDays = days;
  }

  saveProfile(): void {
    this.isSaving.set(true);
    this.settingsService.updateProfile(this.profileForm).subscribe({
      next: (updatedUser) => {
        this.authService.setUser(updatedUser);
        this.currentUser.set(updatedUser);
        this.toast.success('Profile updated successfully', { title: 'Success' });
        this.isSaving.set(false);
      },
      error: () => {
        this.toast.error('Failed to update profile', { title: 'Error' });
        this.isSaving.set(false);
      }
    });
  }

  saveSettings(): void {
    this.isSaving.set(true);
    const updatedSettings: Partial<DoctorSettings> = {
      availableDays: this.availabilitySettings.availableDays,
      startTime: this.availabilitySettings.startTime,
      endTime: this.availabilitySettings.endTime,
      consultationFee: this.billingSettings.consultationFee,
      paymentMethod: this.billingSettings.paymentMethod,
      twoFactorAuth: this.privacySettings.twoFactorAuth,
      shareDataWithPatients: this.privacySettings.shareDataWithPatients,
    };

    this.settingsService.updateSettings(updatedSettings).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.success('Settings saved successfully', { title: 'Success' });
      },
      error: () => {
        this.isSaving.set(false);
        this.toast.error('Failed to save settings', { title: 'Error' });
      }
    });
  }

  getDoctorInitials(): string {
    const user = this.currentUser();
    if (!user) return 'DR';
    const name = `${user.firstName} ${user.lastName}`;
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }
}