import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminThemeService } from '../../../../core/services/admin-theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  @Input() searchPlaceholder: string = 'Search patients, appointments...';
  @Input() showNewAppointmentButton: boolean = true;
  @Output() newAppointmentClick = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();

  searchQuery: string = '';
  themeService = inject(AdminThemeService);
  isDarkMode = signal(false);

  onNewAppointmentClick() {
    this.newAppointmentClick.emit();
  }

  onSearchInput() {
    this.searchChange.emit(this.searchQuery);
  }

  ngOnInit() {
    this.checkDarkMode();
  }

  checkDarkMode() {
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('darkMode') === 'true';
    this.isDarkMode.set(isDark);
  }

  toggleDarkMode() {
    const newMode = !this.isDarkMode();
    this.isDarkMode.set(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
    
    this.themeService.applyTheme(this.themeService.currentTheme()!);
  }

  onButtonHover(event: Event, isEnter: boolean): void {
    const target = event.target as HTMLElement;
    const theme = this.themeService.currentTheme();
    if (target) {
      target.style.backgroundColor = isEnter 
        ? (theme?.primaryHover || '#059669')
        : (theme?.primaryColor || '#10b981');
    }
  }
}
