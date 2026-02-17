export enum UserRole {
  PATIENT = "patient",
  DOCTOR = "doctor",
  ADMIN = "admin",
  RECEPTIONIST = "receptionist",
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  phoneNumber?: string
  avatar?: string
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
  shareActivity?: boolean
  shareAnalytics?: boolean
  personalizedTips?: boolean
}

export interface Doctor extends User {
  available?: boolean;
  rating?: number;
  ratingCount?: number;
  experience?: number;
  experienceYears?: number;
  consultationFee?: number;
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
