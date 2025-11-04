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

}
