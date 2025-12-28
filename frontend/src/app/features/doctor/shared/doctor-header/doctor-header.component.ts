import { Component, inject, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-doctor-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './doctor-header.component.html',
  styleUrls: ['./doctor-header.component.css']
})
export class DoctorHeaderComponent implements OnChanges {
  private router = inject(Router);
  // Inputs
  @Input() initials: string = 'DR';
  @Input() avatarUrl?: string | null;
  @Input() unreadNotifications: number = 0;
  @Input() themeMode: 'light' | 'dark' = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

  // Output
  @Output() themeChange = new EventEmitter<'light' | 'dark'>();

  theme = signal<'light' | 'dark'>(this.themeMode);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['themeMode'] && changes['themeMode'].currentValue) {
      this.theme.set(changes['themeMode'].currentValue);
    }
  }

  toggleTheme() {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    this.themeChange.emit(next);
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }
}
