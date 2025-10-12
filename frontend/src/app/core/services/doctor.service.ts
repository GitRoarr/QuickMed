import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"
import { environment } from "@environments/environment"
import { User } from "../models/user.model"

@Injectable({
  providedIn: "root",
})
export class DoctorService {
  private readonly API_URL = `${environment.apiUrl}/doctors`

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.API_URL)
  }

  getOne(id: string): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/${id}`)
  }

  create(data: any): Observable<User> {
    return this.http.post<User>(this.API_URL, data)
  }

  update(id: string, data: any): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/${id}`, data)
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`)
  }
}
