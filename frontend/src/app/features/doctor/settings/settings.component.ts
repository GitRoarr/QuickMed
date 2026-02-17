import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { AuthService } from '@core/services/auth.service';
import { SettingsService, DoctorSettings, DoctorService } from '@core/services/settings.service';
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
  services = signal<DoctorService[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  activeTab = signal<'profile' | 'availability' | 'billing' | 'privacy'>('profile');
  unreadNotificationCount = signal(0);

  // Service Form State
  showServiceModal = signal(false);
  editingService = signal<DoctorService | null>(null);
  serviceForm = {
    name: '',
    price: 0,
    duration: 30,
    description: ''
  };

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
    this.loadServices();
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

  loadServices(): void {
    this.settingsService.getServices().subscribe({
      next: (data) => this.services.set(data),
      error: () => this.toast.error('Failed to load services')
    });
  }

  openAddService(): void {
    this.editingService.set(null);
    this.serviceForm = { name: '', price: 0, duration: 30, description: '' };
    this.showServiceModal.set(true);
  }

  openEditService(service: DoctorService): void {
    this.editingService.set(service);
    this.serviceForm = {
      name: service.name,
      price: service.price,
      duration: service.duration,
      description: service.description || ''
    };
    this.showServiceModal.set(true);
  }

  saveService(): void {
    if (!this.serviceForm.name || this.serviceForm.price < 0) {
      this.toast.error('Please enter valid service details');
      return;
    }

    const payload: Partial<DoctorService> = {
      name: this.serviceForm.name,
      price: this.serviceForm.price,
      duration: this.serviceForm.duration,
      description: this.serviceForm.description || ''
    };

    const editId = this.editingService()?.id;
    if (editId) {
      this.settingsService.updateService(editId, payload).subscribe({
        next: () => {
          this.toast.success('Service updated');
          this.loadServices();
          this.showServiceModal.set(false);
        },
        error: () => this.toast.error('Failed to update service')
      });
    } else {
      this.settingsService.addService(payload).subscribe({
        next: () => {
          this.toast.success('Service added');
          this.loadServices();
          this.showServiceModal.set(false);
        },
        error: () => this.toast.error('Failed to add service')
      });
    }
  }

  deleteService(id: string): void {
    if (!confirm('Are you sure you want to delete this service?')) return;
    this.settingsService.deleteService(id).subscribe({
      next: () => {
        this.toast.success('Service deleted');
        this.loadServices();
      },
      error: () => this.toast.error('Failed to delete service')
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