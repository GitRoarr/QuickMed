import type { User } from "./user.model"

export enum AppointmentStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export interface Appointment {
  id: string
  appointmentDate: string
  appointmentTime: string
  status: AppointmentStatus
  notes?: string
  patientId: string
  doctorId: string
  patient?: User
  doctor?: User
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
