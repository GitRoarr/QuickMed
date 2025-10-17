import { Injectable, signal } from "@angular/core"

@Injectable({
  providedIn: "root",
})
export class ThemeService {
  isDarkMode = signal<boolean>(false)

  constructor() {
    const savedTheme = localStorage.getItem("theme")
    if (savedTheme === "dark") {
      this.isDarkMode.set(true)
      document.documentElement.classList.add("dark-theme")
    }
  }

  toggleTheme(): void {
    this.isDarkMode.update((value) => !value)

    if (this.isDarkMode()) {
      document.documentElement.classList.add("dark-theme")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark-theme")
      localStorage.setItem("theme", "light")
    }
  }
}
