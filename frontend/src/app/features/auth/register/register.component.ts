import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import {  FormBuilder,  FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import {  Router, RouterLink } from "@angular/router"
import  { AuthService } from "@core/services/auth.service"
import { ToastService } from "@core/services/toast.service"

@Component({
  selector: "app-register",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./register.component.html",
  styleUrls: ["./register.component.css"],
})
export class RegisterComponent {
  registerForm: FormGroup
  errorMessage = ""
  isLoading = false
  showPassword = false

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toast: ToastService,
  ) {
    this.registerForm = this.fb.group({
      firstName: ["", [Validators.required]],
      lastName: ["", [Validators.required]],
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(6)]],
      phoneNumber: ["", [Validators.required]],
    })
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return
    }

    this.isLoading = true
    this.errorMessage = ""

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.isLoading = false
        this.toast.success('Account created successfully', {
          title: 'Welcome aboard',
        })
        this.router.navigate(["/patient/dashboard"])
      },
      error: (error) => {
        this.isLoading = false
        const msg = error.error?.message || "Registration failed. Please try again.";
        this.errorMessage = msg
        this.toast.error(msg, { title: 'Sign up failed' })
      },
    })
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
    } catch (error: any) {
      const msg = error?.message || "Google sign-in failed";
      this.toast.error(msg, { title: "Google Sign-In" });
    }
  }
}
