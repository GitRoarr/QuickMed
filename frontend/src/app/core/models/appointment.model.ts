import type { User } from "./user.model"

export enum AppointmentStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
  MISSED = "missed",
  OVERDUE = "overdue",
  WAITING = "waiting",
  IN_PROGRESS = "in-progress"
}

export interface Appointment {
  id: string
  appointmentDate: string
  appointmentTime: string
  status: AppointmentStatus
  paymentStatus?: 'paid' | 'not_paid' | 'pending' | 'awaiting_payment' | 'pay_at_clinic' | 'failed'
  notes?: string
  patientId: string
  doctorId: string
  patient?: User
  doctor?: User
  appointmentType?: string
  duration?: number
  reason?: string
  location?: string
  isVideoConsultation?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateAppointmentRequest {
  doctorId: string
  appointmentDate: string
  appointmentTime: string
  notes?: string
}

export interface UpdateAppointmentRequest {
  appointmentDate?: string
  appointmentTime?: string
  status?: AppointmentStatus
  notes?: string
}
