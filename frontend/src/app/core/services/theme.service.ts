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
      // keep existing class for other logic
      document.documentElement.classList.add("dark-theme")
      // also add `dark` on documentElement so :root.dark rules apply
      try {
        document.documentElement.classList.add("dark")
      } catch (e) {}
      // also add `dark` on body so component-level CSS targeting `body.dark` applies
      try {
        document.body.classList.add("dark")
      } catch (e) {
        // ignore in non-browser environments
      }
    }
  }

  setTheme(mode: 'light' | 'dark'): void {
    this.isDarkMode.set(mode === 'dark')
    if (mode === 'dark') {
      document.documentElement.classList.add('dark-theme')
      try {
        document.documentElement.classList.add('dark')
      } catch (e) {}
      try {
        document.body.classList.add('dark')
      } catch (e) {}
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark-theme')
      try {
        document.documentElement.classList.remove('dark')
      } catch (e) {}
      try {
        document.body.classList.remove('dark')
      } catch (e) {}
      localStorage.setItem('theme', 'light')
    }
  }

  toggleTheme(): void {
    this.isDarkMode.update((value) => !value)

    if (this.isDarkMode()) {
      document.documentElement.classList.add("dark-theme")
      try {
        document.documentElement.classList.add("dark")
      } catch (e) {}
      try {
        document.body.classList.add("dark")
      } catch (e) {}
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark-theme")
      try {
        document.documentElement.classList.remove("dark")
      } catch (e) {}
      try {
        document.body.classList.remove("dark")
      } catch (e) {}
      localStorage.setItem("theme", "light")
    }
  }
}
