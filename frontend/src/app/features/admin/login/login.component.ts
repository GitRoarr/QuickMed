import { Component, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "@core/services/auth.service";

@Component({
  selector: "app-admin-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class AdminLoginComponent {
  loginForm: FormGroup;
  errorMessage = "";
  isLoading = false;
  showLoginForm = false;
  showPassword = false;
  isBlinking = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(6)]],
    });
  }

  @HostListener("window:keydown", ["$event"])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.code === "KeyA") {
      event.preventDefault();
      this.showLoginForm = !this.showLoginForm;
    }

    if (event.code === "Escape" && this.showLoginForm) {
      this.showLoginForm = false;
    }
  }

  togglePassword(): void {
    this.isBlinking = true;
    this.showPassword = !this.showPassword;

    setTimeout(() => (this.isBlinking = false), 250);
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = "";

      this.authService.loginAdmin(this.loginForm.value).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(["/admin/dashboard"]);
        },
        error: (error) => {
          this.errorMessage = error.error?.message || "Invalid credentials";
          this.isLoading = false;
        },
      });
    }
  }
}
