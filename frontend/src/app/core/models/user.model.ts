export enum UserRole {
  PATIENT = "patient",
  DOCTOR = "doctor",
  ADMIN = "admin",
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  phoneNumber?: string
  medicalHistory?: string
  specialty?: string
  bio?: string
  licenseNumber?: string
  availableDays?: string[]
  startTime?: string
  endTime?: string
  patientId?: string
  dateOfBirth?: string
  bloodType?: string
  allergies?: string[]
  activeMedicationsCount?: number
  medicalRecordsCount?: number
  testResultsCount?: number
  createdAt: Date
  updatedAt: Date
}

export interface AuthResponse {
  user: User
  token: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  phoneNumber: string
  medicalHistory?: string
}
