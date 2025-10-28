import { Component, Input, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
  animateChild,
  group,
  state
} from '@angular/animations';

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
  styleUrls: ['./sidebar.component.css'],
  animations: [
    // Collapse state
    trigger('pulse', [
      state('collapsed', style({ transform: 'scale(0.9)' })),
      state('expanded', style({ transform: 'scale(1)' })),
      transition('* => *', animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ]),
    trigger('rotate', [
      transition('* => *', [
        style({ transform: 'rotate(-180deg)' }),
        animate('300ms ease')
      ])
    ]),
    trigger('rotate180', [
      state('false', style({ transform: 'rotate(0deg)' })),
      state('true', style({ transform: 'rotate(180deg)' })),
      transition('false <=> true', animate('300ms ease'))
    ]),
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(-20px)' }))
      ])
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ height: 0, opacity: 0, overflow: 'hidden' }))
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('stagger', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(60, [
            animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('bounceIn', [
      transition(':enter', [
        style({ transform: 'scale(0.5)', opacity: 0 }),
        animate('400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', style({ transform: 'scale(1)', opacity: 1 }))
      ])
    ]),
    trigger('pulseBtn', [
      transition(':enter', [
        style({ transform: 'scale(0.8)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'scale(1)', opacity: 1 }))
      ])
    ]),
    trigger('fabIn', [
      transition(':enter', [
        style({ transform: 'scale(0) rotate(180deg)' }),
        animate('400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)')
      ])
    ]),
    trigger('fade', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms', style({ opacity: 0.5 }))]),
      transition(':leave', [animate('200ms', style({ opacity: 0 }))])
    ])
  ]
})
export class SidebarComponent implements OnInit {
  @Input() title = 'Dashboard';
  @Input() menuItems: MenuItem[] = [];

  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  isCollapsed = signal(false);
  isDarkMode = signal(false);
  isMobile = signal(false);
  isMobileOpen = signal(false);

  ngOnInit() {
    this.checkMobile();
    this.loadPreferences();
    this.applyDarkMode();
  }

  @HostListener('window:resize')
  checkMobile() {
    this.isMobile.set(window.innerWidth <= 768);
    if (!this.isMobile()) this.isMobileOpen.set(false);
  }

  loadPreferences() {
    const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    const dark = localStorage.getItem('dark-mode') === 'true';
    this.isCollapsed.set(collapsed);
    this.isDarkMode.set(dark);
  }

  applyDarkMode() {
    document.body.classList.toggle('dark', this.isDarkMode());
  }

  toggleCollapse(): void {
    this.isCollapsed.update(v => !v);
    localStorage.setItem('sidebar-collapsed', this.isCollapsed().toString());
  }

  toggleMobile(): void {
    this.isMobileOpen.update(v => !v);
  }

  closeMobile(): void {
    this.isMobileOpen.set(false);
  }

  toggleTheme(): void {
    this.isDarkMode.update(v => !v);
    localStorage.setItem('dark-mode', this.isDarkMode().toString());
    this.applyDarkMode();
  }

  toggleSubmenu(index: number): void {
    if (this.menuItems[index].submenu) {
      this.menuItems[index].expanded = !this.menuItems[index].expanded;
    }
  }

  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName || !lastName) return 'U';
    return (firstName[0] + lastName[0]).toUpperCase();
  }

  getUserRole(): string {
    const user = this.currentUser();
    return user?.role || 'User';
  }

  quickAction(action: string): void {
    if (action === 'new-appointment') {
      this.router.navigate(['/appointments/new']);
    }
  }

  openSettings(): void {
    this.router.navigate(['/settings']);
  }

  logout(): void {
    this.authService.logout();
  }
}