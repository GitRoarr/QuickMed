import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { AuthService } from "@core/services/auth.service";

@Component({
  selector: "app-auth-callback",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./auth-callback.component.html",
  styleUrls: ["./auth-callback.component.css"],
})
export class AuthCallbackComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    setTimeout(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(["/patient/dashboard"]);
      } else {
        this.router.navigate(["/login"]);
      }
    }, 800);
  }
}
