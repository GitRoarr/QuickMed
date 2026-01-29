import { Component, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-doctor-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './doctor-header.component.html',
  styleUrls: ['./doctor-header.component.css']
})
export class DoctorHeaderComponent {
  private router = inject(Router);
  themeService = inject(ThemeService);

  // Inputs
  @Input() initials: string = 'DR';
  @Input() avatarUrl?: string | null;
  @Input() unreadNotifications: number = 0;

  get theme(): 'light' | 'dark' {
    return this.themeService.isDarkMode() ? 'dark' : 'light';
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }
}
