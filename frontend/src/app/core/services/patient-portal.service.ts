import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface PatientDashboardVitals {
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  heartRate: number;
  bmi: number;
  lastCheckupDate: string | null;
}

export interface PatientDashboardAppointment {
  id: string;
  doctor: string;
  specialty?: string;
  appointmentDate: string;
  appointmentTime: string;
  location?: string;
  status: string;
  isVideoConsultation: boolean;
  type: string;
}

export interface PatientDashboardPrescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  doctor: string;
  status: string;
  prescriptionDate: string;
}

export interface PatientDashboardLabResult {
  id: string;
  title: string;
  type: string;
  recordDate?: string;
  status?: string;
  fileUrl?: string;
}

export interface PatientDashboardStats {
  totalAppointments: number;
  confirmed: number;
  videoVisits: number;
  inPersonVisits: number;
}

export interface PatientDashboardData {
  patient: {
    id: string;
    name: string;
    avatar?: string;
    patientId?: string;
  };
  vitals: PatientDashboardVitals;
  stats: PatientDashboardStats;
  upcomingAppointments: PatientDashboardAppointment[];
  prescriptions: PatientDashboardPrescription[];
  labResults: PatientDashboardLabResult[];
}

@Injectable({
  providedIn: 'root',
})
export class PatientPortalService {
  private readonly API_URL = `${environment.apiUrl}/patient-portal`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<PatientDashboardData> {
    return this.http.get<PatientDashboardData>(`${this.API_URL}/dashboard`);
  }
}

