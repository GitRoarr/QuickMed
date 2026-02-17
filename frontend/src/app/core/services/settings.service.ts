import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { User } from '../models/user.model';

export interface DoctorSettings {
  id: string;
  doctorId: string;
  officeAddress?: string;
  officePhone?: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  messageNotifications: boolean;
  availableDays?: string[];
  startTime?: string;
  endTime?: string;
  appointmentDuration?: number;
  consultationFee?: number;
  paymentMethod?: string;
  twoFactorAuth: boolean;
  shareDataWithPatients: boolean;
}

export interface DoctorService {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly API_URL = `${environment.apiUrl}/settings`;

  constructor(private http: HttpClient) { }

  getSettings(): Observable<DoctorSettings> {
    return this.http.get<DoctorSettings>(this.API_URL);
  }

  updateSettings(data: Partial<DoctorSettings>): Observable<DoctorSettings> {
    return this.http.patch<DoctorSettings>(this.API_URL, data);
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/profile`);
  }

  updateProfile(data: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/profile`, data);
  }

  // Doctor Services
  getServices(): Observable<DoctorService[]> {
    return this.http.get<DoctorService[]>(`${this.API_URL}/services`);
  }

  addService(data: Partial<DoctorService>): Observable<DoctorService> {
    return this.http.patch<DoctorService>(`${this.API_URL}/services/add`, data);
  }

  updateService(id: string, data: Partial<DoctorService>): Observable<DoctorService> {
    return this.http.patch<DoctorService>(`${this.API_URL}/services/${id}`, data);
  }

  deleteService(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/services/${id}`);
  }
}
