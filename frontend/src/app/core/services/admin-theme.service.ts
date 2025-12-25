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
      name: 'dark-healthcare',
      mode: 'dark',
      // Medical green accent
      primaryColor: '#19c37d', // medical green
      primaryHover: '#15a76a',
      primaryLight: '#1e2d24', // subtle green-tinted dark
      // Deep dark backgrounds
      backgroundLight: '#181c23', // main app background (charcoal/navy)
      sidebarBg: '#15181e', // sidebar, slightly darker
      backgroundGray: '#232834', // cards/panels, lighter than bg
      // Text
      textDark: '#f3f6fa', // off-white for primary text
      textGray: '#b0b6c3', // muted gray for secondary
      textMuted: '#7a8191', // even more muted for hints
      // Borders & shadows
      borderColor: '#232834', // subtle border, matches card bg
      cardShadow: '0 4px 24px 0 rgba(20, 30, 40, 0.45)', // soft shadow
      // Status colors
      statusConfirmed: '#19c37d', // medical green
      statusPending: '#3ba3c7', // muted blue/teal
      statusCompleted: '#2e8bba', // deeper blue
      statusCancelled: '#e05a5a', // muted red
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.applyTheme(defaultTheme);
  }
}
