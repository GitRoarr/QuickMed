import { Component, EventEmitter, Input, Output, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '@core/services/theme.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnChanges {
  @Input() searchPlaceholder: string = 'Search patients, appointments...';
  @Input() showNewAppointmentButton: boolean = true;
  @Input() unreadNotifications?: number;
  @Output() newAppointmentClick = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();

  searchQuery: string = '';
  themeService = inject(ThemeService);
  private readonly notificationService = inject(NotificationService);

  readonly notificationCount = signal(0);
  
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
    this.resolveNotificationCount();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['unreadNotifications']) {
      this.resolveNotificationCount();
    }
  }

  toggleDarkMode() {
    this.themeService.toggleTheme();
  }

  private resolveNotificationCount(): void {
    if (this.unreadNotifications !== undefined && this.unreadNotifications !== null) {
      this.notificationCount.set(this.unreadNotifications);
      return;
    }

    this.notificationService.getUnreadCount().subscribe({
      next: (count) => this.notificationCount.set(count || 0),
      error: () => this.notificationCount.set(0),
    });
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
