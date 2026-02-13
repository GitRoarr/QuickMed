import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';

export interface DoctorSlot {
  startTime?: string;
  endTime?: string;
  time?: string;
  status: 'available' | 'booked' | 'blocked' | 'pending' | 'cancelled' | 'completed';
  appointmentId?: string;
  blockedReason?: string | null;
}

export type ShiftStatus = 'past' | 'active' | 'upcoming';

export interface Shift {
  type: 'morning' | 'afternoon' | 'evening' | 'custom';
  startTime: string;
  endTime: string;
  slotDuration: number;
  enabled: boolean;
  status?: ShiftStatus;
  label?: string;
}

export interface Break {
  startTime: string;
  endTime: string;
  reason: string;
}

export interface DaySchedule {
  date: string;
  isToday?: boolean;
  isPastDay?: boolean;
  shifts: Shift[];
  breaks: Break[];
  slots: DoctorSlot[];
  sessions: any;
  slotDuration: number;
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

  constructor(private http: HttpClient) { }

  private normalizeDate(date: Date | string): string {
    return typeof date === 'string' ? date : date.toISOString().split('T')[0];
  }

  private withDoctorHeader(doctorId?: string) {
    return doctorId ? { headers: { 'x-doctor-id': doctorId } } : {};
  }

  getDaySchedule(date: Date | string, doctorId?: string): Observable<DaySchedule> {
    const formatted = this.normalizeDate(date);
    return this.http
      .get<any>(`${this.API_URL}/${formatted}`, this.withDoctorHeader(doctorId));
  }

  saveDaySchedule(schedule: DaySchedule, doctorId?: string): Observable<any> {
    return this.http.post(`${this.API_URL}/`, schedule, this.withDoctorHeader(doctorId));
  }

  updateSessions(date: Date | string, sessions: any, slotDuration: number, doctorId?: string): Observable<any> {
    const payload = { date: this.normalizeDate(date), sessions, slotDuration };
    return this.http.post(`${this.API_URL}/sessions`, payload, this.withDoctorHeader(doctorId));
  }

  getDaySchedulePublic(doctorId: string, date: Date | string): Observable<DoctorSlot[]> {
    const formatted = this.normalizeDate(date);
    return this.http
      .get<DayScheduleResponse>(`${this.API_URL}/public/${doctorId}/${formatted}`)
      .pipe(map(res => res.slots));
  }

  setAvailable(date: Date | string, startTime: string, endTime?: string, doctorId?: string): Observable<any> {
    const payload = endTime
      ? { date: this.normalizeDate(date), startTime, endTime }
      : { date: this.normalizeDate(date), time: startTime };
    return this.http.post(`${this.API_URL}/available`, payload, this.withDoctorHeader(doctorId));
  }

  blockSlot(date: Date | string, startTime: string, endTime?: string, doctorId?: string): Observable<any> {
    const payload = endTime
      ? { date: this.normalizeDate(date), startTime, endTime }
      : { date: this.normalizeDate(date), time: startTime };
    return this.http.post(`${this.API_URL}/block`, payload, this.withDoctorHeader(doctorId));
  }

  unblockSlot(date: Date | string, startTime: string, endTime?: string, doctorId?: string): Observable<any> {
    const payload = endTime
      ? { date: this.normalizeDate(date), startTime, endTime }
      : { date: this.normalizeDate(date), time: startTime };
    return this.http.post(`${this.API_URL}/unblock`, payload, this.withDoctorHeader(doctorId));
  }

  removeSlot(date: Date | string, startTime: string, endTime?: string, doctorId?: string): Observable<any> {
    const payload = endTime
      ? { date: this.normalizeDate(date), startTime, endTime }
      : { date: this.normalizeDate(date), time: startTime };
    return this.http.post(`${this.API_URL}/remove`, payload, this.withDoctorHeader(doctorId));
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

  updateWorkingDays(days: number[], startTime?: string, endTime?: string): Observable<any> {
    return this.http.post(`${this.API_URL}/working-days`, { days, startTime, endTime });
  }

  getMonthlyBlockedDays(year: number, month: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/blocked-days`, {
      params: {
        year: year.toString(),
        month: month.toString()
      }
    });
  }

  getWeekSchedule(doctorId: string, startDate: string): Observable<DayScheduleResponse[]> {
    const formatted = this.normalizeDate(startDate);
    return this.http.get<DayScheduleResponse[]>(`${this.API_URL}/public/${doctorId}/week/${formatted}`);
  }

  getAvailableDates(doctorId: string, startDate: string, days: number = 30): Observable<string[]> {
    const formatted = this.normalizeDate(startDate);
    return this.http.get<string[]>(`${this.API_URL}/public/${doctorId}/available-dates`, {
      params: {
        startDate: formatted,
        days: days.toString()
      }
    });
  }
  generateSlots(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/generate`, data);
  }
}
