import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder,  FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import  { Router } from "@angular/router"
import  { AuthService } from "@core/services/auth.service"

@Component({
  selector: "app-admin-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class AdminLoginComponent {
  loginForm: FormGroup
  errorMessage = ""
  isLoading = false

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.loginForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(6)]],
    })
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true
      this.errorMessage = ""

      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          if (response.user.role === "admin") {
            this.router.navigate(["/admin/dashboard"])
          } else {
            this.errorMessage = "Access denied. Admin credentials required."
            this.authService.logout()
          }
          this.isLoading = false
        },
        error: (error) => {
          this.errorMessage = error.error?.message || "Invalid credentials"
          this.isLoading = false
        },
      })
    }
  }
}
