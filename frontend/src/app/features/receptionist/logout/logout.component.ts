import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
    selector: 'app-receptionist-logout',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="logout-overlay" [class.dark]="themeService.isDark()">
      <div class="content">
        <div class="logo">
          <img src="assets/images/QuickMed-Logo.png" alt="QuickMed">
        </div>
        <div class="spinner"></div>
        <h2>Logging you out...</h2>
        <p>Safely closing your session. See you soon!</p>
      </div>
    </div>
  `,
    styles: [`
    .logout-overlay {
      position: fixed;
      inset: 0;
      background: #f8fafc;
      display: grid;
      place-items: center;
      z-index: 9999;
      color: #0f172a;
    }
    .logout-overlay.dark {
      background: #08090f;
      color: #f1f5f9;
    }
    .content {
      text-align: center;
      animation: fadeIn 0.5s ease;
    }
    .logo {
      width: 80px;
      margin-bottom: 2rem;
      margin-inline: auto;
    }
    .logo img { width: 100%; }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(22, 163, 74, 0.1);
      border-top-color: #16a34a;
      border-radius: 50%;
      margin-inline: auto;
      margin-bottom: 1.5rem;
      animation: spin 1s linear infinite;
    }
    h2 { font-weight: 800; margin-bottom: 0.5rem; }
    p { color: #64748b; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class LogoutComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    themeService = inject(ThemeService);

    ngOnInit(): void {
        setTimeout(() => {
            this.authService.logout();
            this.router.navigate(['/login']);
        }, 2000);
    }
}
