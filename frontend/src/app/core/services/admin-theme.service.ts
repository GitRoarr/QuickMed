import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Theme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  primaryColor: string;
  primaryHover: string;
  primaryLight: string;
  backgroundLight: string;
  sidebarBg: string;
  backgroundGray: string;
  textDark: string;
  textGray: string;
  textMuted: string;
  borderColor: string;
  cardShadow: string;
  statusConfirmed: string;
  statusPending: string;
  statusCompleted: string;
  statusCancelled: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class AdminThemeService {
  private apiUrl = `${environment.apiUrl}/admin`;
  currentTheme = signal<Theme | null>(null);
  currentTheme$ = this.currentTheme.asReadonly();

  constructor(private http: HttpClient) {
    this.loadTheme();
  }

  loadTheme(): void {
    this.getActiveTheme().subscribe({
      next: (theme) => {
        this.currentTheme.set(theme);
        this.applyTheme(theme);
      },
      error: (error) => {
        console.error('Failed to load theme:', error);
        // Apply default theme on error
        this.applyDefaultTheme();
      },
    });
  }

  getActiveTheme(): Observable<Theme> {
    return this.http.get<Theme>(`${this.apiUrl}/theme`).pipe(
      tap((theme) => {
        this.currentTheme.set(theme);
        this.applyTheme(theme);
      })
    );
  }

  getAllThemes(): Observable<Theme[]> {
    return this.http.get<Theme[]>(`${this.apiUrl}/themes`);
  }

  getThemeById(id: string): Observable<Theme> {
    return this.http.get<Theme>(`${this.apiUrl}/themes/${id}`);
  }

  createTheme(theme: Partial<Theme>): Observable<Theme> {
    return this.http.post<Theme>(`${this.apiUrl}/themes`, theme);
  }

  updateTheme(id: string, theme: Partial<Theme>): Observable<Theme> {
    return this.http.put<Theme>(`${this.apiUrl}/themes/${id}`, theme);
  }

  setActiveTheme(id: string): Observable<Theme> {
    return this.http.patch<Theme>(`${this.apiUrl}/themes/${id}/activate`, {}).pipe(
      tap((theme) => {
        this.currentTheme.set(theme);
        this.applyTheme(theme);
      })
    );
  }

  deleteTheme(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/themes/${id}`);
  }
  // good work

  applyTheme(theme: Theme): void {
    const root = document.documentElement;
    
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--primary-hover', theme.primaryHover);
    root.style.setProperty('--primary-light', theme.primaryLight);
    root.style.setProperty('--background-light', theme.backgroundLight);
    root.style.setProperty('--sidebar-bg', theme.sidebarBg);
    root.style.setProperty('--background-gray', theme.backgroundGray);
    root.style.setProperty('--text-dark', theme.textDark);
    root.style.setProperty('--text-gray', theme.textGray);
    root.style.setProperty('--text-muted', theme.textMuted);
    root.style.setProperty('--border-color', theme.borderColor);
    root.style.setProperty('--card-shadow', theme.cardShadow);
    root.style.setProperty('--status-confirmed', theme.statusConfirmed);
    root.style.setProperty('--status-pending', theme.statusPending);
    root.style.setProperty('--status-completed', theme.statusCompleted);
    root.style.setProperty('--status-cancelled', theme.statusCancelled);

    // Apply mode class
    if (theme.mode === 'dark') {
      document.body.classList.add('dark');
      document.documentElement.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark');
      document.documentElement.classList.remove('dark-theme');
    }
  }

  applyDefaultTheme(): void {
    const defaultTheme: Theme = {
      id: '',
      name: 'default',
      mode: 'light',
      primaryColor: '#10b981',
      primaryHover: '#059669',
      primaryLight: '#d1fae5',
      backgroundLight: '#ffffff',
      sidebarBg: '#f5f5f5',
      backgroundGray: '#f0f0f0',
      textDark: '#000000',
      textGray: '#4b5563',
      textMuted: '#6b7280',
      borderColor: '#e5e5e5',
      cardShadow: '0 2px 5px rgba(0, 0, 0, 0.08)',
      statusConfirmed: '#10b981',
      statusPending: '#f97316',
      statusCompleted: '#3b82f6',
      statusCancelled: '#ef4444',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.applyTheme(defaultTheme);
  }
}
