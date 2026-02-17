import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-receptionist-logout',
  standalone: true,
  imports: [CommonModule],
  template: '',
  styles: []
})
export class LogoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  themeService = inject(ThemeService);

  ngOnInit(): void {
    this.authService.logout();
    this.router.navigate(['/']); // Redirect to homepage
  }
}
