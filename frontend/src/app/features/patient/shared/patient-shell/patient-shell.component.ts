import { Component, inject, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { MessageService } from '@core/services/message.service';
import { NotificationService } from '@core/services/notification.service';

interface PatientNavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-patient-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-shell.component.html',
  styleUrls: ['./patient-shell.component.css'],
})
export class PatientShellComponent implements OnInit {
  sidebarOpen = false;
  mobile = false;
  themeMode = signal<'light' | 'dark'>('light');
  private readonly THEME_KEY = 'patient_theme_mode';
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly notificationService = inject(NotificationService);

  unreadMessages = signal(0);
  unreadNotifications = signal(0);

  menuItems: PatientNavItem[] = [
    { label: 'Dashboard', icon: 'bi-speedometer2', route: '/patient/dashboard' },
    { label: 'Appointments', icon: 'bi-calendar3', route: '/patient/appointments' },
    { label: 'Find Doctors', icon: 'bi-people', route: '/patient/doctors' },
    { label: 'Medical Records', icon: 'bi-file-earmark-medical', route: '/patient/records' },
    { label: 'Messages', icon: 'bi-chat-dots', route: '/patient/messages' },
    { label: 'Profile', icon: 'bi-person', route: '/patient/profile' },
    { label: 'Settings', icon: 'bi-gear', route: '/patient/settings' },
  ];

  get user() {
    return this.authService.currentUser();
  }

  setTheme(mode: 'light' | 'dark'): void {
    this.themeMode.set(mode);
    this.applyTheme(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.THEME_KEY, mode);
      } catch {}
    }
  }

  toggleTheme(): void {
    const next = this.themeMode() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  ngOnInit(): void {
    this.mobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
    this.loadCounts();
    const stored = typeof window !== 'undefined' ? localStorage.getItem(this.THEME_KEY) : null;
    if (stored === 'dark' || stored === 'light') {
      this.themeMode.set(stored as 'light' | 'dark');
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.themeMode.set(prefersDark ? 'dark' : 'light');
    }
    this.applyTheme(this.themeMode());
  }

  private loadCounts(): void {
    this.messageService.getUnreadCount().subscribe({
      next: (res) => this.unreadMessages.set(res.count || 0),
      error: () => this.unreadMessages.set(0),
    });

    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotifications.set(count || 0),
      error: () => this.unreadNotifications.set(0),
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.mobile = typeof window !== 'undefined' && window.innerWidth <= 1024;
  }

  @HostListener('window:storage', ['$event'])
  onStorage(e: StorageEvent): void {
    if (e && e.key === this.THEME_KEY && (e.newValue === 'dark' || e.newValue === 'light')) {
      const mode = e.newValue as 'light' | 'dark';
      this.themeMode.set(mode);
      this.applyTheme(mode);
    }
  }

  private applyTheme(mode: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;
    const body = document.body;
    body.classList.toggle('dark', mode === 'dark');
    body.classList.toggle('dark-theme', mode === 'dark');
  }

  logout(): void {
    this.authService.logout();
  }
}

