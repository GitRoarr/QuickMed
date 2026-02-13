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
    revenue: number;
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
  gender?: string;
  age?: number;
  condition?: string;
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
    patientId: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    avatar: string;
    lastSeen: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    bloodType?: string;
    allergies?: string;
    emergencyContact?: string;
  };
  stats: {
    totalVisits: number;
    completedVisits: number;
    cancelledVisits: number;
    lastStatus: string;
    nextFollowUp: string | null;
    totalRecords: number;
    totalPrescriptions: number;
  };
  appointments: {
    id: string;
    date: string;
    time: string;
    type: string;
    status: string;
    reason?: string;
    notes?: string;
  }[];
  medicalRecords: {
    id: string;
    title: string;
    type: string;
    recordDate: string;
    notes?: string;
    createdAt: string;
  }[];
  prescriptions: {
    id: string;
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    status: string;
    createdAt: string;
  }[];
}

export interface DoctorListItem {
  id: string;
  firstName: string;
  lastName: string;
  specialty?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  private apiUrl = `${environment.apiUrl}/doctors`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DoctorDashboardData> {
    return this.http.get<DoctorDashboardData>(`${this.apiUrl}/dashboard`);
  }

  getStats(): Observable<DoctorStats> {
    return this.http.get<DoctorStats>(`${this.apiUrl}/stats`);
  }

  getAnalytics(period: string = '6months'): Observable<DoctorAnalytics> {
    return this.http.get<DoctorAnalytics>(`${this.apiUrl}/analytics`, { params: { period } });
  }

  getPatients(
    page: number,
    limit: number,
    searchTerm?: string,
    status?: string
  ): Observable<{ patients: DoctorPatientSummary[]; total: number }> {
    let params: any = { page, limit };
    if (searchTerm) params = { ...params, searchTerm };
    if (status) params = { ...params, status };
    return this.http.get<{ patients: DoctorPatientSummary[]; total: number }>(
      `${this.apiUrl}/patients`,
      { params }
    );
  }

  getPatientDetail(patientId: string): Observable<DoctorPatientDetail> {
    return this.http.get<DoctorPatientDetail>(
      `${this.apiUrl}/patients/${patientId}`
    );
  }

  getDoctorList(): Observable<DoctorListItem[]> {
    return this.http.get<DoctorListItem[]>(`${this.apiUrl}/list`);
  }
  
  listDoctors(): Observable<DoctorListItem[]> {
    return this.http.get<DoctorListItem[]>(`${this.apiUrl}`);
  }

  getAvailability(doctorId: string, date: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/${doctorId}/availability`, { params: { date } });
  }

  getAppointmentDetails(appointmentId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/appointments/${appointmentId}`);
  }

  getAppointmentsForPatient(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/appointments/patient/${patientId}`);
  }
}
