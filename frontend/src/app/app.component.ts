
import { Component, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ToastContainerComponent } from "@shared/components/toast/toast-container.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <button class="theme-toggle-btn" (click)="toggleTheme()" [attr.aria-label]="isDark ? 'Switch to light theme' : 'Switch to dark theme'">
      <span *ngIf="!isDark">🌙</span>
      <span *ngIf="isDark">☀️</span>
    </button>
    <router-outlet></router-outlet>
    <app-toast-container></app-toast-container>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isDark = false;

  ngOnInit() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      this.setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  toggleTheme() {
    this.setTheme(this.isDark ? 'light' : 'dark');
  }

  setTheme(theme: 'light' | 'dark') {
    document.body.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('light', theme === 'light');
    this.isDark = theme === 'dark';
    localStorage.setItem('theme', theme);
  }
}