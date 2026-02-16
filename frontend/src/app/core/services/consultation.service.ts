
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
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
  doctorId?: string;
  patientId?: string;
  notes: string;
  diagnosis?: string;
  treatments: Treatment[];
  startTime?: Date;
  endTime?: Date;
  durationMin?: number;
  rating?: number;
  comment?: string;
  createdAt?: Date;
  updatedAt?: Date;
  appointment?: any;
  doctor?: any;
  patient?: any;
}

export interface CreateConsultationDto {
  appointmentId: string;
  notes: string;
  diagnosis?: string;
  treatments?: Omit<Treatment, 'id'>[];
}

@Injectable({
  providedIn: 'root'
})
export class ConsultationService {
  private apiUrl = `${environment.apiUrl}/consultations`;

  constructor(private http: HttpClient) { }

  create(consultation: CreateConsultationDto): Observable<Consultation> {
    return this.http.post<Consultation>(this.apiUrl, consultation);
  }

  update(id: string, consultation: Partial<CreateConsultationDto>): Observable<Consultation> {
    return this.http.patch<Consultation>(`${this.apiUrl}/${id}`, consultation);
  }

  getById(id: string): Observable<Consultation> {
    return this.http.get<Consultation>(`${this.apiUrl}/${id}`);
  }

  getConsultationByAppointment(appointmentId: string): Observable<Consultation | null> {
    return this.http.get<Consultation | null>(`${this.apiUrl}/by-appointment/${appointmentId}`).pipe(
      catchError(() => this.http.get<Consultation | null>(`${this.apiUrl}/${appointmentId}`)),
      catchError(() => of(null))
    );
  }

  getMyConsultations(): Observable<Consultation[]> {
    return this.http.get<Consultation[]>(`${this.apiUrl}/my-consultations`);
  }

  start(dto: { appointmentId?: string; doctorId: string; patientId: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/start`, dto);
  }

  end(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/end`, {});
  }
}
