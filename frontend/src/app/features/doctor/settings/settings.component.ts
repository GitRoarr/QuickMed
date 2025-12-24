import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { SettingsService, DoctorSettings } from '@core/services/settings.service';
import { User } from '@core/models/user.model';
import { AppointmentService } from '@core/services/appointment.service';
import { MessageService } from '@core/services/message.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-doctor-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private settingsService = inject(SettingsService);
  private appointmentService = inject(AppointmentService);
  private messageService = inject(MessageService);

  currentUser = signal<User | null>(null);
  settings = signal<DoctorSettings | null>(null);
  isLoading = signal(true);
  activeTab = signal('profile');
  isSaving = signal(false);

  menuItems = signal<MenuItem[]>([]);

  profileForm = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    specialty: '',
    licenseNumber: '',
    bio: '',
    officeAddress: '',
    officePhone: '',
  };

  notificationSettings = {
    emailNotifications: true,
    smsNotifications: true,
    appointmentReminders: true,
    messageNotifications: true,
  };

  availabilitySettings = {
    availableDays: [] as string[],
    startTime: '',
    endTime: '',
    appointmentDuration: 30,
  };

  billingSettings = {
    consultationFee: 0,
    paymentMethod: '',
  };

  privacySettings = {
    twoFactorAuth: false,
    shareDataWithPatients: true,
  };

  ngOnInit(): void {
    this.loadUserData();
    this.loadSettings();
    this.loadBadgeCounts();
  }

  loadBadgeCounts(): void {
    this.appointmentService.getPendingCount().subscribe({
      next: (data) => {
        this.updateMenuItems(data.count || 0, 0);
      }
    });

    this.messageService.getUnreadCount().subscribe({
      next: (data) => {
        this.appointmentService.getPendingCount().subscribe({
          next: (aptData) => {
            this.updateMenuItems(aptData.count || 0, data.count || 0);
          }
        });
      }
    });
  }

  updateMenuItems(appointmentCount: number, messageCount: number): void {
    this.menuItems.set([
      { label: 'Dashboard', icon: 'bi-house-door', route: '/doctor/dashboard' },
      { label: 'Appointments', icon: 'bi-calendar-check', route: '/doctor/appointments', badge: appointmentCount > 0 ? appointmentCount : undefined },
      { label: 'Schedule', icon: 'bi-calendar3', route: '/doctor/schedule' },
      { label: 'My Patients', icon: 'bi-people', route: '/doctor/patients' },
      { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/doctor/records' },
      { label: 'Prescriptions', icon: 'bi-prescription2', route: '/doctor/prescriptions' },
      { label: 'Messages', icon: 'bi-chat-dots', route: '/doctor/messages', badge: messageCount > 0 ? messageCount : undefined },
      { label: 'Analytics', icon: 'bi-graph-up', route: '/doctor/analytics' },
      { label: 'Settings', icon: 'bi-gear', route: '/doctor/settings' },
    ]);
  }

  loadUserData(): void {
    const user = this.authService.currentUser();
    this.currentUser.set(user);
    if (user) {
      this.profileForm = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        specialty: user.specialty || '',
        licenseNumber: user.licenseNumber || '',
        bio: user.bio || '',
        officeAddress: '',
        officePhone: '',
      };
    }
  }

  loadSettings(): void {
    this.isLoading.set(true);
    this.settingsService.getSettings().subscribe({
      next: (data) => {
        this.settings.set(data);
        this.profileForm.officeAddress = data.officeAddress || '';
        this.profileForm.officePhone = data.officePhone || '';
        this.notificationSettings = {
          emailNotifications: data.emailNotifications,
          smsNotifications: data.smsNotifications,
          appointmentReminders: data.appointmentReminders,
          messageNotifications: data.messageNotifications,
        };
        this.availabilitySettings = {
          availableDays: data.availableDays || [],
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          appointmentDuration: data.appointmentDuration || 30,
        };
        this.billingSettings = {
          consultationFee: data.consultationFee || 0,
          paymentMethod: data.paymentMethod || '',
        };
        this.privacySettings = {
          twoFactorAuth: data.twoFactorAuth,
          shareDataWithPatients: data.shareDataWithPatients,
        };
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  saveProfile(): void {
    this.isSaving.set(true);
    this.settingsService.updateProfile(this.profileForm).subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.authService.setUser(user);
        this.isSaving.set(false);
        alert('Profile updated successfully');
      },
      error: () => {
        this.isSaving.set(false);
        alert('Failed to update profile');
      }
    });
  }

  saveSettings(): void {
    this.isSaving.set(true);
    const settingsData = {
      ...this.notificationSettings,
      ...this.availabilitySettings,
      ...this.billingSettings,
      ...this.privacySettings,
      officeAddress: this.profileForm.officeAddress,
      officePhone: this.profileForm.officePhone,
    };
    this.settingsService.updateSettings(settingsData).subscribe({
      next: (data) => {
        this.settings.set(data);
        this.isSaving.set(false);
        alert('Settings saved successfully');
      },
      error: () => {
        this.isSaving.set(false);
        alert('Failed to save settings');
      }
    });
  }

  toggleDay(day: string): void {
    const index = this.availabilitySettings.availableDays.indexOf(day);
    if (index > -1) {
      this.availabilitySettings.availableDays.splice(index, 1);
    } else {
      this.availabilitySettings.availableDays.push(day);
    }
  }

  getDoctorName(): string {
    const user = this.currentUser();
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Doctor';
  }

  getDoctorSpecialty(): string {
    const user = this.currentUser();
    return user?.specialty || 'General Practitioner';
  }

  getDoctorInitials(): string {
    const name = this.getDoctorName();
    if (!name) return 'DR';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  setTheme(theme: 'light' | 'dark') {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
    localStorage.setItem('theme', theme);
  }
}
