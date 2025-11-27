import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "@environments/environment";
import { Observable } from "rxjs";
import { MedicalRecord } from "../models/medical-record.model";

@Injectable({ providedIn: 'root' })
export class MedicalRecordService {
  private readonly API = `${environment.apiUrl}/medical-records`;

  constructor(private http: HttpClient) {}

  getByPatient(patientId: string): Observable<MedicalRecord[]> {
    return this.http.get<MedicalRecord[]>(`${this.API}/patient/${patientId}`);
  }

  getOne(id: string): Observable<MedicalRecord> {
    return this.http.get<MedicalRecord>(`${this.API}/${id}`);
  }

  download(id: string) {
    return this.http.get<{url?: string}>(`${this.API}/${id}/download`);
  }

  create(payload: Partial<MedicalRecord>) {
    return this.http.post<MedicalRecord>(this.API, payload);
  }
}
