import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "@environments/environment";
import { User } from "../models/user.model";

@Injectable({
  providedIn: "root",
})
export class DoctorService {
  private readonly API_URL = `${environment.apiUrl}/admin/doctors`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.API_URL);
  }

  getOne(id: string): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/${id}`);
  }
}
