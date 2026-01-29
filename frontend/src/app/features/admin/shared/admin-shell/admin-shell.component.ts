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

  brandIconLightUrl = 'https://img.icons8.com/?size=100&id=Rv1HRKHN3ri7&format=png&color=000000';
  brandIconDarkUrl = 'https://img.icons8.com/?size=100&id=Rv1HRKHN3ri7&format=png&color=FFFFFF';
  doctorIconLightUrl = 'assets/icons/doctor-light.png';
  doctorIconDarkUrl = 'assets/icons/doctor-dark.png';

  menuItems: { label: string; icon?: string; iconImgLight?: string; iconImgDark?: string; route: string; exact?: boolean }[] = [
    { label: "Overview", icon: "bi-grid", route: "/admin/overview", exact: true },
    { label: "Appointments", icon: "bi-calendar", route: "/admin/appointments" },
    { label: "Patients", icon: "bi-people", route: "/admin/patients" },
    { label: "Doctors", route: "/admin/doctors", iconImgLight: this.doctorIconLightUrl, iconImgDark: this.doctorIconDarkUrl },
    { label: "Receptionists", icon: "bi-headset", route: "/admin/receptionists" },
    // Use a widely supported Bootstrap icon to ensure visibility
    { label: "User Management", icon: "bi-people", route: "/admin/users" },
    { label: "Analytics", icon: "bi-bar-chart", route: "/admin/analytics" },
    { label: "Settings", icon: "bi-gear", route: "/admin/settings" },
  ];

  ngOnInit() {
    this.checkMobile();
    this.loadUserData();
    this.loadNotifications();
    this.setupNotificationPolling();
  }

  @HostListener('window:resize')
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
    const user = this.authService.currentUser();
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
