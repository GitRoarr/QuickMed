import { Component, inject, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
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
export class DoctorHeaderComponent implements OnChanges {
  private router = inject(Router);
  themeService = inject(ThemeService);
  
  // Inputs
  @Input() initials: string = 'DR';
  @Input() avatarUrl?: string | null;
  @Input() unreadNotifications: number = 0;
  @Input() themeMode: 'light' | 'dark' = this.themeService.isDarkMode() ? 'dark' : 'light';

  // Output
  @Output() themeChange = new EventEmitter<'light' | 'dark'>();

  get theme(): 'light' | 'dark' {
    return this.themeService.isDarkMode() ? 'dark' : 'light';
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Sync with ThemeService if themeMode input changes
    if (changes['themeMode'] && changes['themeMode'].currentValue) {
      this.themeService.setTheme(changes['themeMode'].currentValue);
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    const next = this.themeService.isDarkMode() ? 'dark' : 'light';
    this.themeChange.emit(next);
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }
}
