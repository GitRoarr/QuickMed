
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export enum TreatmentType {
  MEDICATION = 'medication',
  THERAPY = 'therapy',
  PROCEDURE = 'procedure',
  LAB_TEST = 'lab_test',
}

export interface Treatment {
  id?: string;
  type: TreatmentType;
  details: string;
  instructions?: string;
  administered?: boolean;
}

export interface Consultation {
  id?: string;
  appointmentId: string;
  notes: string;
  treatments: Treatment[];
  createdAt?: Date;
  updatedAt?: Date;
}


@Injectable({
  providedIn: 'root'
})
export class ConsultationService {
  private apiUrl = `${environment.apiUrl}/consultations`;

  constructor(private http: HttpClient) { }

  create(consultation: Consultation): Observable<Consultation> {
    return this.http.post<Consultation>(this.apiUrl, consultation);
  }

  getConsultationByAppointment(appointmentId: string): Observable<Consultation | null> {
    return this.http.get<Consultation | null>(`${this.apiUrl}/by-appointment/${appointmentId}`);
  }

  getMyConsultations(): Observable<Consultation[]> {
    return this.http.get<Consultation[]>(`${this.apiUrl}/my-consultations`);
  }
}
