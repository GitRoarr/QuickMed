import { Injectable } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import  { Observable } from "rxjs"
import { environment } from "@environments/environment"
import  { User } from "../models/user.model"

@Injectable({
  providedIn: "root",
})
export class UserService {
  private readonly API_URL = `${environment.apiUrl}/users`

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.API_URL)
  }

  getPatients(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/patients`)
  }

  getDoctors(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/doctors`)
  }

  getOne(id: string): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/${id}`)
  }

  update(id: string, data: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/${id}`, data)
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`)
  }
   updateAvatar(userId: string, file: File): Observable<User> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.patch<User>(`${this.API_URL}/${userId}/avatar`, formData);
  }

  
}
