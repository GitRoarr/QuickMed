import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConsultationStats {
  averageConsultationMinutes: number;
  satisfactionRate: number; // 0..5
  reviewsCount: number;
  sampleSize: number;
  period: { start: string | null; end: string | null };
}

@Injectable({ providedIn: 'root' })
export class ConsultationsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/consultations`;

  getStats(start?: string, end?: string): Observable<ConsultationStats> {
    const params: any = {};
    if (start) params.start = start;
    if (end) params.end = end;
    return this.http.get<ConsultationStats>(`${this.baseUrl}/stats`, { params });
  }
}
