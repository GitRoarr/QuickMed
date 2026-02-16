import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable } from 'rxjs';

export interface PlatformSummary {
  average: number;
  count: number;
  happyPatients: number;
  doctorCount: number;
}

export interface FeaturedTestimonial {
  id: string;
  rating: number;
  comment: string;
  patientName: string;
  patientRole: string;
  patientAvatar?: string | null;
  createdAt: string;
}

export interface HeroMetrics {
  nextVisit: string;
  liveVitals: string;
  doctorsOnline: number;
}

export interface LandingFeature {
  icon: string;
  title: string;
  description: string;
}

export interface LandingStep {
  number: number;
  title: string;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class LandingMetricsService {
  private readonly reviewsUrl = `${environment.apiUrl}/reviews`;
  private readonly landingUrl = `${environment.apiUrl}/landing`;

  constructor(private http: HttpClient) { }

  getSummary(): Observable<PlatformSummary> {
    return this.http.get<PlatformSummary>(`${this.reviewsUrl}/summary`);
  }

  getFeaturedTestimonials(limit = 3): Observable<FeaturedTestimonial[]> {
    return this.http.get<FeaturedTestimonial[]>(`${this.reviewsUrl}/featured`, {
      params: { limit: limit.toString() },
    });
  }

  getHeroMetrics(userId?: string): Observable<HeroMetrics> {
    return this.http.get<HeroMetrics>(`${this.reviewsUrl}/hero-metrics`, {
      params: userId ? { userId } : {},
    });
  }

  getFeatures(): Observable<LandingFeature[]> {
    return this.http.get<LandingFeature[]>(`${this.landingUrl}/features`);
  }

  getSteps(): Observable<LandingStep[]> {
    return this.http.get<LandingStep[]>(`${this.landingUrl}/steps`);
  }
}


