import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';
import { AuthService } from '@core/services/auth.service';

export interface SidebarNavItem {
  label: string;
  icon: string;
  route?: string;
  exact?: boolean;
  action?: () => void;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  standalone: true,
  styleUrls: ['./sidebar.component.css'],
  imports: [CommonModule, RouterModule],
})
export class SidebarComponent {
  @Input() title: string = 'QuickMed';
  @Input() menuItems: SidebarNavItem[] = [];
  @Input() secondaryItems: SidebarNavItem[] = [];
  @Input() collapsible: boolean = true;
  @Input() collapsed: boolean = false;
  themeService = inject(ThemeService);
  private authService = inject(AuthService);

  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/']); 
  }

  toggleCollapse(): void {
    if (!this.collapsible) return;
    this.collapsed = !this.collapsed;
  }

  handleItemClick(item: SidebarNavItem, event?: Event): void {
    if (!item.action) return;
    if (event) event.preventDefault();
    item.action();
  }

  logout(): void {
    this.authService.logout();
  }
}
