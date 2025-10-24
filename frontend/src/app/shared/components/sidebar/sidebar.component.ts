import { Component, Input, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  submenu?: SubMenuItem[];
  expanded?: boolean;
}

interface SubMenuItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  @Input() title = 'Dashboard';
  @Input() menuItems: MenuItem[] = [];
  
  private authService = inject(AuthService);
  private router = inject(Router);
  
  currentUser = this.authService.currentUser;
  isCollapsed = signal(false);
  isDarkMode = signal(false);

  ngOnInit() {
    // Load saved preferences
    this.isCollapsed.set(localStorage.getItem('sidebar-collapsed') === 'true');
    this.isDarkMode.set(localStorage.getItem('dark-mode') === 'true');
    
    // Apply dark mode
    if (this.isDarkMode()) {
      document.body.classList.add('dark');
    }
  }

  toggleCollapse(): void {
    this.isCollapsed.update(collapsed => !collapsed);
    localStorage.setItem('sidebar-collapsed', this.isCollapsed().toString());
  }

  toggleTheme(): void {
    this.isDarkMode.update(dark => !dark);
    localStorage.setItem('dark-mode', this.isDarkMode().toString());
    document.body.classList.toggle('dark');
  }

  toggleSubmenu(index: number): void {
    if (this.menuItems[index].submenu) {
      this.menuItems[index].expanded = !this.menuItems[index].expanded;
    }
  }

  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName || !lastName) return 'U';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  }

  getUserRole(): string {
    const user = this.currentUser();
    if (!user) return 'Guest';
    
    // You can enhance this based on your user role system
    return user.role || 'User';
  }

  quickAction(action: string): void {
    switch (action) {
      case 'new-appointment':
        this.router.navigate(['/appointments/new']);
        break;
      case 'search':
        // Implement search functionality
        console.log('Search triggered');
        break;
    }
  }

  openSettings(): void {
    this.router.navigate(['/settings']);
  }

  logout(): void {
    this.authService.logout();
  }
}
