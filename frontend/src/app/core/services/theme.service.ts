import { Injectable, signal, computed } from "@angular/core"

@Injectable({
  providedIn: "root",
})
export class ThemeService {
  isDarkMode = signal<boolean>(false);
  isDark = computed(() => this.isDarkMode());

  constructor() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  toggleTheme(): void {
    const isDark = !this.isDarkMode();
    this.setTheme(isDark ? 'dark' : 'light');
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.isDarkMode.set(theme === 'dark');
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }
}
