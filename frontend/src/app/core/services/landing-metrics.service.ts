import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable } from 'rxjs';

export interface PlatformSummary {
  average: number;
  count: number;
  happyPatients: number;
}

@Injectable({
  providedIn: 'root',
})
export class LandingMetricsService {
  private readonly API_URL = `${environment.apiUrl}/reviews/summary`;

  constructor(private http: HttpClient) {}

  getSummary(): Observable<PlatformSummary> {
    return this.http.get<PlatformSummary>(this.API_URL);
  }
}


