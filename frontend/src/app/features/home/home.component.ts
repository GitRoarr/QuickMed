import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { Router, RouterLink } from "@angular/router"
import { AuthService } from "@core/services/auth.service"
import { ThemeService } from "@core/services/theme.service"

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.css"],
})
export class HomeComponent {
  currentUser = this.authService.currentUser
  isDarkMode = this.themeService.isDarkMode

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
  ) {}

  isHomePage(): boolean {
    try {
      const url = this.router.url || '';
      return url === '/' || url === '' || url.startsWith('/?');
    } catch (e) {
      return false;
    }
  }

  logout(): void {
    this.authService.logout()
  }

  navigateToDashboard(): void {
    const user = this.currentUser()
    if (!user) {
      this.router.navigate(["/login"])
      return
    }

    switch (user.role) {
      case "patient":
        this.router.navigate(["/patient/dashboard"])
        break
      case "doctor":
        this.router.navigate(["/doctor/dashboard"])
        break
      case "admin":
        this.router.navigate(["/admin/dashboard"])
        break
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme()
  }
 getUserAvatar(): string {
  const user = this.currentUser()
  return user?.avatar || 'assets/images/profile-placeholder.png'
}
getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return '?'
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : ''
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : ''
  return `${firstInitial}${lastInitial}`
}
navbarClasses() {
    return {
      "bg-light": !this.isDarkMode(),
      "bg-dark": this.isDarkMode(),
      "navbar-light": !this.isDarkMode(),
      "navbar-dark": this.isDarkMode(),
      "text-dark": !this.isDarkMode(),
      "text-white": this.isDarkMode(),
    };
  }


}
