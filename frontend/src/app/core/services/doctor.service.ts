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
}
