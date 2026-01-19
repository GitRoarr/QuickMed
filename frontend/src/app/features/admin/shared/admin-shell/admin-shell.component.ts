import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent],
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.css']
})
export class AdminShellComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  themeService = inject(ThemeService);

  @Input() searchPlaceholder: string = 'Search patients, appointments...';

  sidebarOpen = signal(false);
  mobile = signal(false);
  unreadNotifications = signal(0);
  currentUser = signal<any>(null);

  // Shared menu items for all admin pages
  menuItems = [
    { label: "Overview", icon: "bi-grid", route: "/admin/overview" },
    { label: "Appointments", icon: "bi-calendar", route: "/admin/appointments" },
    { label: "Patients", icon: "bi-people", route: "/admin/patients" },
    { label: "Doctors", icon: "bi-stethoscope", route: "/admin/doctors" },
    { label: "Receptionists", icon: "bi-headset", route: "/admin/receptionists" },
    { label: "User Management", icon: "bi-person-gear", route: "/admin/users" },
    { label: "Analytics", icon: "bi-bar-chart", route: "/admin/analytics" },
    { label: "Settings", icon: "bi-gear", route: "/admin/settings" },
  ];

  ngOnInit() {
    this.checkMobile();
    this.loadUserData();
    this.loadNotifications();
    this.setupNotificationPolling();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkMobile();
  }

  checkMobile() {
    this.mobile.set(window.innerWidth < 1024);
    if (!this.mobile()) {
      this.sidebarOpen.set(false);
    }
  }

  loadUserData() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUser.set(user);
    }
  }

  loadNotifications() {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.unreadNotifications.set(count),
      error: (err) => console.error('Failed to load notifications:', err)
    });
  }

  setupNotificationPolling() {
    // Poll for notifications every 30 seconds
    setInterval(() => {
      this.loadNotifications();
    }, 30000);
  }

  toggleSidebar() {
    this.sidebarOpen.update(value => !value);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }
}
