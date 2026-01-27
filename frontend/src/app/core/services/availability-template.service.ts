import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
    AvailabilityTemplate,
    CreateTemplateDto
} from '../models/availability-template.model';

@Injectable({
    providedIn: 'root'
})
export class AvailabilityTemplateService {
    private readonly API_URL = `${environment.apiUrl}/doctors/templates`;

    constructor(private http: HttpClient) { }

    getTemplates(): Observable<AvailabilityTemplate[]> {
        return this.http.get<AvailabilityTemplate[]>(this.API_URL);
    }

    getTemplate(id: string): Observable<AvailabilityTemplate> {
        return this.http.get<AvailabilityTemplate>(`${this.API_URL}/${id}`);
    }

    getDefaultTemplate(): Observable<AvailabilityTemplate | null> {
        return this.http.get<AvailabilityTemplate | null>(`${this.API_URL}/default`);
    }

    createTemplate(data: CreateTemplateDto): Observable<AvailabilityTemplate> {
        return this.http.post<AvailabilityTemplate>(this.API_URL, data);
    }

    updateTemplate(id: string, data: Partial<CreateTemplateDto>): Observable<AvailabilityTemplate> {
        return this.http.put<AvailabilityTemplate>(`${this.API_URL}/${id}`, data);
    }

    deleteTemplate(id: string): Observable<{ success: boolean }> {
        return this.http.delete<{ success: boolean }>(`${this.API_URL}/${id}`);
    }

    createPresets(): Observable<AvailabilityTemplate[]> {
        return this.http.get<AvailabilityTemplate[]>(`${this.API_URL}/presets`);
    }
}
