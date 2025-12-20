import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable } from 'rxjs';

export interface PlatformSummary {
  average: number;
  count: number;
  happyPatients: number;
}

export interface FeaturedTestimonial {
  id: string;
  rating: number;
  comment: string;
  patientName: string;
  patientRole: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class LandingMetricsService {
  private readonly baseUrl = `${environment.apiUrl}/reviews`;

  constructor(private http: HttpClient) {}

  getSummary(): Observable<PlatformSummary> {
    return this.http.get<PlatformSummary>(`${this.baseUrl}/summary`);
  }

  getFeaturedTestimonials(limit = 3): Observable<FeaturedTestimonial[]> {
    return this.http.get<FeaturedTestimonial[]>(`${this.baseUrl}/featured`, {
      params: { limit: limit.toString() },
    });
  }
}


