import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'doctor' | 'patient';
  phoneNumber?: string;
  dateOfBirth?: string;
  bloodType?: string;
  allergies?: string[];
  specialty?: string;
  licenseNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  isVideoConsultation: boolean;
  location?: string;
  patient?: User;
  doctor?: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getAllUsers(page: number = 1, limit: number = 10, role?: string): Observable<PaginatedResponse<User>> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (role) params = params.set('role', role);
    return this.http.get<PaginatedResponse<User>>(`${this.apiUrl}/users`, { params });
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  createUser(userData: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, userData);
  }

  updateUser(id: string, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, userData);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
  }

  getAllAppointments(page: number = 1, limit: number = 10, status?: string): Observable<PaginatedResponse<Appointment>> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (status) params = params.set('status', status);
    return this.http.get<PaginatedResponse<Appointment>>(`${this.apiUrl}/appointments`, { params });
  }

  createAppointment(appointmentData: Partial<Appointment>): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.apiUrl}/appointments`, appointmentData);
  }

  updateAppointment(id: string, appointmentData: Partial<Appointment>): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.apiUrl}/appointments/${id}`, appointmentData);
  }

  deleteAppointment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/appointments/${id}`);
  }

  // Doctor-related backend logic integrated
  createDoctorInvitation(data: any): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/doctors`, data);
  }

  validateDoctorLicense(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/doctors/${id}/validate-license`, {});
  }

  confirmDoctorEmployment(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/doctors/${id}/confirm-employment`, {});
  }

  activateDoctor(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/doctors/${id}/activate`, {});
  }

  updateDoctor(id: string, data: any): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/doctors/${id}`, data);
  }

  deleteDoctor(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/doctors/${id}`);
  }
}
