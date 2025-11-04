import { Component, Input, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  submenu?: MenuItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  @Input() title = 'Dashboard';
  @Input() menuItems: MenuItem[] = [];

  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  sidebarCollapsed = signal(false);
  isDarkMode = signal(false);
  isMobile = signal(false);
  isMobileOpen = signal(false);

  ngOnInit() {
    this.loadCurrentUser();
    this.checkMobile();
    this.loadPreferences();
  }

  loadCurrentUser() {
    const user = this.authService.currentUser();
    this.currentUser.set(user);
  }

  checkMobile() {
    this.isMobile.set(window.innerWidth <= 768);
    if (!this.isMobile()) this.isMobileOpen.set(false);
  }

  loadPreferences() {
    const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    const dark = localStorage.getItem('dark-mode') === 'true';
    this.sidebarCollapsed.set(collapsed);
    this.isDarkMode.set(dark);
    this.applyDarkMode();
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
    localStorage.setItem('sidebar-collapsed', this.sidebarCollapsed().toString());
  }

  toggleTheme() {
    this.isDarkMode.update(v => !v);
    localStorage.setItem('dark-mode', this.isDarkMode().toString());
    this.applyDarkMode();
  }

  applyDarkMode() {
    document.body.classList.toggle('dark', this.isDarkMode());
  }

  openSettings() {
    this.router.navigate(['/settings']);
  }

  logout() {
    this.authService.logout();
  }

  navigate(route: string) {
    this.router.navigate([route]);
    if (this.isMobile()) this.isMobileOpen.set(false);
  }

  toggleSubmenu(index: number) {
    if (this.menuItems[index].submenu) {
      this.menuItems[index].expanded = !this.menuItems[index].expanded;
    }
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.userService.updateAvatar(this.currentUser()?.id!, file)
      .subscribe(user => this.currentUser.set(user));
  }

  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName || !lastName) return 'U';
    return (firstName[0] + lastName[0]).toUpperCase();
  }
}
