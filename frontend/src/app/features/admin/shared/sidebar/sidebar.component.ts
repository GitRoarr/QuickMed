import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  styleUrls: ['./sidebar.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class SidebarComponent implements OnInit {
  @Input() title: string = 'QuickMed';
  @Input() menuItems: SidebarNavItem[] = [];
  @Input() secondaryItems: SidebarNavItem[] = [];
  @Input() collapsible: boolean = true;
  @Input() collapsed: boolean = false;
  darkTheme = false;

  constructor(private router: Router, private themeService: ThemeService, public authService: AuthService) {}

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

  ngOnInit(): void {
    this.darkTheme = this.themeService.isDarkMode();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.darkTheme = this.themeService.isDarkMode();
  }
}
