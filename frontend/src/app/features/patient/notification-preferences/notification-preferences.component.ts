import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  prescriptionAlerts: boolean;
  testResultAlerts: boolean;
  systemUpdates: boolean;
  marketingEmails: boolean;
  reminderTime: number;
  quietHoursStart: string;
  quietHoursEnd: string;
}

@Component({
  selector: 'app-notification-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-preferences.component.html',
  styleUrls: ['./notification-preferences.component.css']
})
export class NotificationPreferencesComponent implements OnInit {
  isLoading = signal(false);
  isSaving = signal(false);
  showSuccessMessage = signal(false);
  sidebarCollapsed = signal(false);
  
  preferences = signal<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    prescriptionAlerts: true,
    testResultAlerts: true,
    systemUpdates: true,
    marketingEmails: false,
    reminderTime: 30,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00'
  });

  menuItems = [
    { label: 'Dashboard', icon: 'bi-house', route: '/patient/dashboard', active: false },
    { label: 'My Appointments', icon: 'bi-calendar-check', route: '/patient/appointments', active: false },
    { label: 'Settings', icon: 'bi-gear', route: '/patient/settings', active: true }
  ];

  ngOnInit(): void {
    this.loadPreferences();
  }

  loadPreferences(): void {
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
    }, 500);
  }

  savePreferences(): void {
    this.isSaving.set(true);
    setTimeout(() => {
      this.isSaving.set(false);
      this.showSuccessMessage.set(true);
      setTimeout(() => this.showSuccessMessage.set(false), 3000);
    }, 1000);
  }

  updatePreference(key: keyof NotificationPreferences, value: any): void {
    this.preferences.set({
      ...this.preferences(),
      [key]: value
    });
  }

  resetToDefaults(): void {
    this.preferences.set({
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      appointmentReminders: true,
      prescriptionAlerts: true,
      testResultAlerts: true,
      systemUpdates: true,
      marketingEmails: false,
      reminderTime: 30,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00'
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }
}
