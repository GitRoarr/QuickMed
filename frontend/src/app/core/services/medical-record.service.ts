import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface MedicalRecord {
  id: string;
  title: string;
  type: 'lab' | 'prescription' | 'imaging' | 'diagnosis' | 'other';
  recordDate?: string;
  patientId: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  doctorId?: string;
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  fileUrl?: string;
  notes?: string;
  description?: string;
  fileSize?: number;
  status?: 'verified' | 'pending' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicalRecordDto {
  title: string;
  type?: 'lab' | 'prescription' | 'imaging' | 'diagnosis' | 'other';
  recordDate?: string;
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  fileUrl?: string;
  notes?: string;
  description?: string;
  fileSize?: number;
  status?: 'verified' | 'pending' | 'rejected';
}

export interface MedicalRecordStats {
  total: number;
  labCount: number;
  imagingCount: number;
  diagnosisCount: number;
  prescriptionCount: number;
  otherCount: number;
  verifiedCount: number;
  pendingCount: number;
  thisWeekCount?: number;
}

@Injectable({
  providedIn: 'root',
})
export class MedicalRecordService {
  private readonly API_URL = `${environment.apiUrl}/medical-records`;

  constructor(private http: HttpClient) { }

  create(data: CreateMedicalRecordDto): Observable<MedicalRecord> {
    return this.http.post<MedicalRecord>(this.API_URL, data);
  }

  getMyRecords(search?: string): Observable<MedicalRecord[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<MedicalRecord[]>(`${this.API_URL}/my`, { params });
  }

  getStats(): Observable<MedicalRecordStats> {
    return this.http.get<MedicalRecordStats>(`${this.API_URL}/stats`);
  }

  getByPatient(patientId: string): Observable<MedicalRecord[]> {
    return this.http.get<MedicalRecord[]>(`${this.API_URL}/patient/${patientId}`);
  }

  getByAppointment(appointmentId: string): Observable<MedicalRecord[]> {
    return this.http.get<MedicalRecord[]>(`${this.API_URL}/appointment/${appointmentId}`);
  }

  getOne(id: string): Observable<MedicalRecord> {
    return this.http.get<MedicalRecord>(`${this.API_URL}/${id}`);
  }

  uploadFile(file: File, patientId: string, doctorId?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', patientId);
    if (doctorId) formData.append('doctorId', doctorId);
    return this.http.post<any>(`${this.API_URL}/upload`, formData);
  }

  download(id: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.API_URL}/${id}/download`);
  }

  updateStatus(id: string, status: string): Observable<MedicalRecord> {
    return this.http.patch<MedicalRecord>(`${this.API_URL}/${id}/status`, { status });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
