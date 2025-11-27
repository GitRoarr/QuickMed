import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class ReceptionistService {
  private readonly API_URL = `${environment.apiUrl}/receptionist`;

  constructor(private http: HttpClient) {}

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

  getDashboard(doctorId?: string, status?: string): Observable<any> {
    const params: any = {};
    if (doctorId) params.doctorId = doctorId;
    if (status) params.status = status;
    const qs = new URLSearchParams(params).toString();
    return this.http.get<any>(`${this.API_URL}/dashboard${qs ? `?${qs}` : ''}`);
  }
}
