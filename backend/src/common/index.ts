export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
  RECEPTIONIST = 'receptionist',
}

export enum AppointmentStatus {
  PENDING = 'pending',
  PENDING_PAYMENT = 'pending_payment',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
  WAITING = 'waiting',
  IN_PROGRESS = 'in-progress',
  SCHEDULED = 'scheduled',
  MISSED = 'missed',
  OVERDUE = 'overdue',
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

export enum PaymentStatus {
  PAID = 'paid',
  NOT_PAID = 'not_paid',
  PENDING = 'pending',
}