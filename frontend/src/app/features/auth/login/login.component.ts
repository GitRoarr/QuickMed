import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "@core/services/auth.service";
import { ToastService } from "@core/services/toast.service";

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
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toast: ToastService,
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

        this.toast.success(`Welcome back, ${user.firstName || 'there'}!`, {
          title: 'Signed in',
        });

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
          case "receptionist":
            this.router.navigate(["/receptionist/dashboard"]);
            break;
          default:
            this.router.navigate(["/"]);
        }
      },
      error: (error) => {
        this.isLoading = false;
        const msg = error.error?.message || "Invalid email or password";
        this.errorMessage = msg;
        this.toast.error(msg, { title: 'Login failed' });
      },
    });
  }

  resetForm(): void {
    this.loginForm.reset();
    this.errorMessage = "";
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
