import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '@core/services/theme.service';

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
  themeService = inject(ThemeService);
  
  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  onNewAppointmentClick() {
    this.newAppointmentClick.emit();
  }

  onSearchInput() {
    this.searchChange.emit(this.searchQuery);
  }

  ngOnInit() {
    // ThemeService already handles initialization in constructor
  }

  toggleDarkMode() {
    this.themeService.toggleTheme();
  }

  onButtonHover(event: Event, isEnter: boolean): void {
    const target = event.target as HTMLElement;
    if (target) {
      // Use CSS classes for hover instead of inline styles
      if (isEnter) {
        target.classList.add('hover');
      } else {
        target.classList.remove('hover');
      }
    }
  }
}
