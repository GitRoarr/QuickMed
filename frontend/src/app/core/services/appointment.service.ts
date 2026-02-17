import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"
import { environment } from "@environments/environment"
import { Appointment, CreateAppointmentRequest, UpdateAppointmentRequest } from "../models/appointment.model"

@Injectable({
  providedIn: "root",
})
export class AppointmentService {
  private readonly API_URL = `${environment.apiUrl}/appointments`

  constructor(private http: HttpClient) { }

  create(data: CreateAppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(this.API_URL, data)
  }

  getAll(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.API_URL)
  }

  getMyAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.API_URL}/my-appointments`)
  }

  getByPatient(patientId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.API_URL}/patient/${patientId}`)
  }

  getByDoctor(doctorId: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.API_URL}/doctor/${doctorId}`)
  }

  getOne(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.API_URL}/${id}`)
  }

  getAppointmentById(id: string): Observable<Appointment> {
    return this.getOne(id)
  }

  update(id: string, data: UpdateAppointmentRequest): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.API_URL}/${id}`, data)
  }

  confirm(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.API_URL}/${id}/confirm`, {})
  }

  cancel(id: string): Observable<Appointment> {
    return this.http.patch<Appointment>(`${this.API_URL}/${id}/cancel`, {})
  }

  delete(id: string): Observable<Appointment> {
    return this.http.delete<Appointment>(`${this.API_URL}/${id}`)
  }

  getPendingCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.API_URL}/pending-count`)
  }

  getDoctorServices(doctorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/settings/services?doctorId=${doctorId}`)
  }
}
