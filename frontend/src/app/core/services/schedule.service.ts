import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';

export interface DoctorSlot {
  startTime?: string;
  endTime?: string;
  time?: string; // legacy fallback
  status: 'available' | 'booked' | 'blocked';
  appointmentId?: string;
}

export interface DayScheduleResponse {
  date: string;
  slots: DoctorSlot[];
}

@Injectable({
  providedIn: 'root'
})
export class SchedulingService {
  private readonly API_URL = `${environment.apiUrl}/doctors/schedule`;

  constructor(private http: HttpClient) {}

  private normalizeDate(date: Date | string): string {
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
  }

  getDaySchedule(date: Date | string): Observable<DoctorSlot[]> {
    const formatted = this.normalizeDate(date);
    return this.http
      .get<DayScheduleResponse>(`${this.API_URL}/${formatted}`)
      .pipe(map(res => res.slots));
  }

  setAvailable(date: Date | string, startTime: string, endTime?: string): Observable<any> {
    const payload = endTime
      ? { date: this.normalizeDate(date), startTime, endTime }
      : { date: this.normalizeDate(date), time: startTime };
    return this.http.post(`${this.API_URL}/available`, payload);
  }

  blockSlot(date: Date | string, startTime: string, endTime?: string): Observable<any> {
    const payload = endTime
      ? { date: this.normalizeDate(date), startTime, endTime }
      : { date: this.normalizeDate(date), time: startTime };
    return this.http.post(`${this.API_URL}/block`, payload);
  }

  unblockSlot(date: Date | string, startTime: string, endTime?: string): Observable<any> {
    const payload = endTime
      ? { date: this.normalizeDate(date), startTime, endTime }
      : { date: this.normalizeDate(date), time: startTime };
    return this.http.post(`${this.API_URL}/unblock`, payload);
  }

  getMonthlyOverview(year: number, month: number): Observable<any> {
    return this.http.get(`${this.API_URL}/overview`, {
      params: {
        year: year.toString(),
        month: month.toString()
      }
    });
  }

  getDoctorWorkingDays(): Observable<number[]> {
    return this.http.get<number[]>(`${this.API_URL}/working-days`);
  }

  updateWorkingDays(days: number[]): Observable<any> {
    return this.http.post(`${this.API_URL}/working-days`, { days });
  }

  getMonthlyBlockedDays(year: number, month: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/blocked-days`, {
      params: {
        year: year.toString(),
        month: month.toString()
      }
    });
  }
}
