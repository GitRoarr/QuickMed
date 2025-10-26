export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'prescription' | 'test_result' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  userId: string;
  relatedEntityId?: string;
  relatedEntityType?: 'appointment' | 'prescription' | 'test_result' | 'user' | 'system';
  actionUrl?: string;
  actionText?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  metadata?: {
    appointmentId?: string;
    doctorId?: string;
    patientId?: string;
    prescriptionId?: string;
    testResultId?: string;
    [key: string]: any;
  };
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  prescriptionAlerts: boolean;
  testResultAlerts: boolean;
  systemUpdates: boolean;
  marketingEmails: boolean;
  reminderTime: number; // minutes before appointment
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string; // HH:mm format
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  message: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    info: number;
    success: number;
    warning: number;
    error: number;
    appointment: number;
    prescription: number;
    test_result: number;
    system: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

