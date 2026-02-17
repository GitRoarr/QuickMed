import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class ReceptionistService {
  private readonly API_URL = `${environment.apiUrl}/receptionist`;

  constructor(private http: HttpClient) { }

  createPatient(data: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/patients`, data);
  }

  updatePatient(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.API_URL}/patients/${id}`, data);
  }

  listPatients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/patients`);
  }

  createAppointment(data: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/appointments`, data);
  }

  updateAppointment(id: string, data: any): Observable<any> {
    return this.http.patch<any>(`${this.API_URL}/appointments/${id}`, data);
  }

  markArrived(id: string): Observable<any> {
    return this.http.patch<any>(`${this.API_URL}/appointments/${id}/arrive`, {});
  }

  setPayment(id: string, paymentStatus: string): Observable<any> {
    return this.http.patch<any>(`${this.API_URL}/appointments/${id}/payment`, { paymentStatus });
  }

  getDashboard(doctorId?: string, status?: string, search?: string): Observable<any> {
    const params: any = {};
    if (doctorId) params.doctorId = doctorId;
    if (status) params.status = status;
    if (search) params.search = search;
    const qs = new URLSearchParams(params).toString();
    return this.http.get<any>(`${this.API_URL}/dashboard${qs ? `?${qs}` : ''}`);
  }

  listAppointments(filters?: {
    date?: string;
    doctorId?: string;
    status?: string;
    patientId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<any[]> {
    const params: any = {};
    if (filters?.date) params.date = filters.date;
    if (filters?.doctorId) params.doctorId = filters.doctorId;
    if (filters?.status) params.status = filters.status;
    if (filters?.patientId) params.patientId = filters.patientId;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    const qs = new URLSearchParams(params).toString();
    return this.http.get<any[]>(`${this.API_URL}/appointments${qs ? `?${qs}` : ''}`);
  }

  getAppointment(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/appointments/${id}`);
  }

  listPayments(filters?: { status?: string; date?: string; search?: string }): Observable<any[]> {
    const params: any = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.date) params.date = filters.date;
    if (filters?.search) params.search = filters.search;
    const qs = new URLSearchParams(params).toString();
    return this.http.get<any[]>(`${this.API_URL}/payments${qs ? `?${qs}` : ''}`);
  }

  getPaymentStats(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/payments/stats`);
  }

  listDoctorAvailability(date?: string): Observable<any[]> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.http.get<any[]>(`${this.API_URL}/doctors/availability${qs}`);
  }

  updateDoctorSchedule(doctorId: string, date: string, shifts: any[], breaks: any[] = []): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/doctors/${doctorId}/schedule`, { date, shifts, breaks });
  }

  addDoctorSlot(doctorId: string, date: string, slot: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/doctors/${doctorId}/slots`, { date, slot });
  }

  getDailyReport(date?: string): Observable<any> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.http.get<any>(`${this.API_URL}/reports/daily${qs}`);
  }

  getAppointmentReport(filters?: { startDate?: string; endDate?: string; doctorId?: string; status?: string }): Observable<any[]> {
    const params: any = {};
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.doctorId) params.doctorId = filters.doctorId;
    if (filters?.status) params.status = filters.status;
    const qs = new URLSearchParams(params).toString();
    return this.http.get<any[]>(`${this.API_URL}/reports/appointments${qs ? `?${qs}` : ''}`);
  }

  getPatientVisitReport(filters?: { startDate?: string; endDate?: string }): Observable<any> {
    const params: any = {};
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    const qs = new URLSearchParams(params).toString();
    return this.http.get<any>(`${this.API_URL}/reports/patient-visits${qs ? `?${qs}` : ''}`);
  }

  getPaymentReport(filters?: { startDate?: string; endDate?: string }): Observable<any> {
    const params: any = {};
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    const qs = new URLSearchParams(params).toString();
    return this.http.get<any>(`${this.API_URL}/reports/payments${qs ? `?${qs}` : ''}`);
  }

  getDoctorActivityReport(filters?: { startDate?: string; endDate?: string }): Observable<any[]> {
    const params: any = {};
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    const qs = new URLSearchParams(params).toString();
    return this.http.get<any[]>(`${this.API_URL}/reports/doctor-activity${qs ? `?${qs}` : ''}`);
  }

  getNoShowReport(filters?: { startDate?: string; endDate?: string }): Observable<any[]> {
    const params: any = {};
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    const qs = new URLSearchParams(params).toString();
    return this.http.get<any[]>(`${this.API_URL}/reports/no-shows${qs ? `?${qs}` : ''}`);
  }

  listMessageThreads(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/messages/threads`);
  }

  getMessageThread(receiverId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/messages/thread/${receiverId}`);
  }

  sendMessage(payload: { receiverId: string; receiverRole: 'patient' | 'doctor'; content: string }): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/messages`, payload);
  }

  getDoctorServices(doctorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/settings/services?doctorId=${doctorId}`);
  }
}
