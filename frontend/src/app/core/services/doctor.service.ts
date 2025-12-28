import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface DoctorDashboardData {
  stats: {
    todayAppointments: number;
    pendingConfirmations: number;
    totalPatients: number;
    avgConsultationTime: number;
    satisfactionRate: number;
    completedToday: number;
    confirmedToday: number;
    revenueToday?: number;
    unreadMessages?: number;
  };
  todayAppointments: Array<{
    id: string;
    time: string;
    patient: string;
    patientId: string;
    type: string;
    status: string;
    reason: string;
    isVideoConsultation: boolean;
  }>;
  appointmentsByTime: { [key: string]: { completed: number; pending: number } };
  recentPatients: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  trends: {
    appointmentsChange: number;
    patientsChange: number;
    consultationChange: number;
    satisfactionChange: number;
  };
}

export interface DoctorStats {
  totalAppointments: number;
  totalPatients: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export interface DoctorAnalytics {
  kpis: {
    totalAppointments: number;
    completionRate: number;
    patientSatisfaction: number;
    newPatients: number;
  };
  trends: {
    appointmentsChange: number;
    completionChange: number;
    satisfactionChange: number;
    newPatientsChange: number;
  };
  appointmentTrends: { [key: string]: { completed: number; cancelled: number; noShow: number } };
  satisfactionTrend: number[];
}

export interface DoctorPatientSummary {
  patientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  lastAppointmentDate?: string;
  lastAppointmentTime?: string;
  lastStatus?: string;
  totalAppointments: number;
  isActive?: boolean;
}

export interface DoctorListItem {
  id: string;
  firstName: string;
  lastName: string;
  specialty?: string;
}

export interface DoctorPatientDetail {
  patient: {
    id: string;
    patientId?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
    avatar?: string;
    totalAppointments?: number;
    lastAppointmentDate?: string;
    lastAppointmentTime?: string;
    lastStatus?: string;
  };
  appointments: Array<{
    id: string;
    appointmentDate: string;
    appointmentTime: string;
    type: string;
    status: string;
    reason?: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  private readonly API_URL = `${environment.apiUrl}/doctors`;

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<DoctorDashboardData> {
    return this.http.get<DoctorDashboardData>(`${this.API_URL}/dashboard`);
  }

  getStats(): Observable<DoctorStats> {
    return this.http.get<DoctorStats>(`${this.API_URL}/stats`);
  }

  getAnalytics(period: string = '6months'): Observable<DoctorAnalytics> {
    return this.http.get<DoctorAnalytics>(`${this.API_URL}/analytics`, { params: { period } });
  }

  getMyPatients(): Observable<DoctorPatientSummary[]> {
    return this.http.get<DoctorPatientSummary[]>(`${this.API_URL}/patients`);
  }

  listDoctors(): Observable<DoctorListItem[]> {
    return this.http.get<DoctorListItem[]>(`${this.API_URL}`);
  }

  // Fetch available time slots for a doctor on a specific date
  getAvailability(doctorId: string, date: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/${doctorId}/availability`, { params: { date } });
  }

  // Patient detail for doctor view
  getPatientDetail(patientId: string): Observable<DoctorPatientDetail> {
    return this.http.get<DoctorPatientDetail>(`${this.API_URL}/patients/${patientId}`);
  }
}
