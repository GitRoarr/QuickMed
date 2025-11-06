import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '@core/services/notification.service';
import { NotificationPreferences } from '@core/models/notification.model';

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
  preferences = signal<NotificationPreferences | null>(null);
  showSuccessMessage = signal(false);

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadPreferences();
  }

  async loadPreferences(): Promise<void> {
    try {
      this.isLoading.set(true);
      const preferences = await this.notificationService.getNotificationPreferences().toPromise();
      if (preferences) {
        this.preferences.set(preferences);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async savePreferences(): Promise<void> {
    try {
      this.isSaving.set(true);
      const currentPreferences = this.preferences();
      if (currentPreferences) {
        await this.notificationService.updateNotificationPreferences(currentPreferences).toPromise();
        this.showSuccessMessage.set(true);
        setTimeout(() => this.showSuccessMessage.set(false), 3000);
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  updatePreference(key: keyof NotificationPreferences, value: any): void {
    const currentPreferences = this.preferences();
    if (currentPreferences) {
      this.preferences.set({
        ...currentPreferences,
        [key]: value
      });
    }
  }

  resetToDefaults(): void {
    this.preferences.set({
      id: '',
      userId: '',
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
      quietHoursEnd: '08:00',
      timezone: 'UTC',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}





