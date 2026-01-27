import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { DailyStats, WeeklySummary, DoctorAnalytics } from '../models/doctor-analytics.model';

@Injectable({
    providedIn: 'root'
})
export class DoctorAnalyticsService {
    private readonly API_URL = `${environment.apiUrl}/doctors/analytics`;

    constructor(private http: HttpClient) { }

    getTodayStats(): Observable<DailyStats> {
        return this.http.get<DailyStats>(`${this.API_URL}/today`);
    }

    getWeekStats(startDate?: string): Observable<WeeklySummary> {
        const params = startDate ? { startDate } : {};
        return this.http.get<WeeklySummary>(`${this.API_URL}/week`, { params });
    }

    getMonthStats(year: number, month: number): Observable<DoctorAnalytics[]> {
        return this.http.get<DoctorAnalytics[]>(`${this.API_URL}/month`, {
            params: { year: year.toString(), month: month.toString() }
        });
    }
}
