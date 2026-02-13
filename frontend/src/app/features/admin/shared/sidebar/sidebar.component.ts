import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';
import { AuthService } from '@core/services/auth.service';
import { SidebarService } from '@core/services/sidebar.service';

export interface SidebarNavItem {
  label: string;
  icon?: string;
  iconImgLight?: string;
  iconImgDark?: string;
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
  constructor(
    private router: Router,
    public themeService: ThemeService,
    public authService: AuthService,
    public sidebarService: SidebarService
  ) { }

  get darkTheme(): boolean {
    return this.themeService.isDarkMode();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  toggleCollapse(): void {
    if (!this.collapsible) return;
    this.collapsed = !this.collapsed;
  }

  closeSidebarOnMobile(): void {
    if (window.innerWidth <= 1024) {
      this.sidebarService.close();
    }
  }

  handleItemClick(item: SidebarNavItem, event?: Event): void {
    if (!item.action) return;
    if (event) event.preventDefault();
    item.action();
    this.closeSidebarOnMobile();
  }



  logout(): void {
    this.authService.logout();
  }

  ngOnInit(): void {
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
