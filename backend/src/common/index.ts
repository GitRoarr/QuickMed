export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
}

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  WAITING = 'waiting',
  IN_PROGRESS = 'in-progress',
  SCHEDULED = 'scheduled',
}

export enum AppointmentType {
  CONSULTATION = 'Consultation',
  FOLLOW_UP = 'Follow-up',
  NEW_PATIENT = 'New Patient',
  VIDEO_CALL = 'Video Call',
  CHECKUP = 'Checkup',
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  APPOINTMENT = 'appointment',
  PRESCRIPTION = 'prescription',
  TEST_RESULT = 'test_result',
  SYSTEM = 'system',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}