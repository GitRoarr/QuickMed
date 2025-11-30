import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface Review {
  id: string;
  doctorId: string;
  patientId: string;
  rating: number;
  comment?: string;
  appointmentId?: string;
  createdAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateReviewDto {
  doctorId: string;
  rating: number;
  comment?: string;
  appointmentId?: string;
}

export interface DoctorRating {
  average: number;
  count: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private readonly API_URL = `${environment.apiUrl}/reviews`;

  constructor(private http: HttpClient) {}

  create(data: CreateReviewDto): Observable<Review> {
    return this.http.post<Review>(this.API_URL, data);
  }

  getDoctorReviews(doctorId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.API_URL}/doctor/${doctorId}`);
  }

  getDoctorRating(doctorId: string): Observable<DoctorRating> {
    return this.http.get<DoctorRating>(`${this.API_URL}/doctor/${doctorId}/rating`);
  }
}
