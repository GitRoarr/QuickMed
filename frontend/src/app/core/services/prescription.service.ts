import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  patientId: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  frequency: string;
  duration: string;
  prescriptionDate: string;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  instructions?: string;
}

export interface CreatePrescriptionDto {
  medication: string;
  dosage: string;
  patientId: string;
  frequency: string;
  duration: string;
  prescriptionDate?: string;
  status?: 'active' | 'completed' | 'cancelled';
  notes?: string;
  instructions?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PrescriptionService {
  private readonly API_URL = `${environment.apiUrl}/prescriptions`;

  constructor(private http: HttpClient) {}

  create(data: CreatePrescriptionDto): Observable<Prescription> {
    return this.http.post<Prescription>(this.API_URL, data);
  }

  getAll(search?: string): Observable<Prescription[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<Prescription[]>(this.API_URL, { params });
  }

  getOne(id: string): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.API_URL}/${id}`);
  }

  updateStatus(id: string, status: 'active' | 'completed' | 'cancelled'): Observable<Prescription> {
    return this.http.patch<Prescription>(`${this.API_URL}/${id}/status`, { status });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
