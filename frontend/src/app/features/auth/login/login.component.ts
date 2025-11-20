import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "@core/services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage = "";
  isLoading = false;

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

  ngOnInit() {}

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = "";

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading = false;
        const user = response.user;

        switch (user.role) {
          case "patient":
            this.router.navigate(["/patient/dashboard"]);
            break;
          case "doctor":
            this.router.navigate(["/doctor/dashboard"]);
            break;
          case "admin":
            this.router.navigate(["/admin/dashboard"]);
            break;
          default:
            this.router.navigate(["/"]);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || "Invalid email or password";
      },
    });
  }

  resetForm(): void {
    this.loginForm.reset();
    this.errorMessage = "";
  }
}
