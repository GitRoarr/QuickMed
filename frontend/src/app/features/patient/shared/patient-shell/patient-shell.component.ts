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

  logout(): void {
    this.authService.logout();
  }
}

