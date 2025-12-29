
import { Component, OnInit, inject } from "@angular/core";
import { ThemeService } from '@core/services/theme.service';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from "@angular/router";
import { ToastContainerComponent } from "@shared/components/toast/toast-container.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent, CommonModule],
  template: `
    <router-outlet></router-outlet>
    <app-toast-container></app-toast-container>
  `
})
export class AppComponent implements OnInit {
  themeService = inject(ThemeService);

  ngOnInit() {
    // ThemeService constructor already applies the saved theme
    // Optionally, re-apply on init to guarantee
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      this.themeService.setTheme(saved as 'dark' | 'light');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.themeService.setTheme('dark');
    } else {
      this.themeService.setTheme('light');
    }
  }
}