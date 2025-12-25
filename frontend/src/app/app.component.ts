
import { Component, OnInit } from "@angular/core";
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