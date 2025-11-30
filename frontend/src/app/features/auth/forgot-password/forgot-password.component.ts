import { Component, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "@core/services/auth.service";
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';

@Component({
  selector: "app-forgot-password",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AlertMessageComponent],
  templateUrl: "./forgot-password.component.html",
  styleUrls: ["./forgot-password.component.css"],
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  errorMessage = "";
  successMessage = "";
  isLoading = false;
  emailSent = false;
  @ViewChild('alert') alertRef?: AlertMessageComponent;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = "";
    this.successMessage = "";

    const email = this.forgotPasswordForm.get('email')?.value;

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.emailSent = true;
        this.successMessage = "Password reset instructions have been sent to your email address.";
        setTimeout(() => {
          if (this.alertRef) {
            this.alertRef.message = this.successMessage;
            this.alertRef.type = 'success';
            this.alertRef.show();
          }
        }, 0);
      },
      error: (error) => {
        this.isLoading = false;
        const msg = error.error?.message || "Failed to send reset email. Please try again.";
        this.errorMessage = msg;
        setTimeout(() => {
          if (this.alertRef) {
            this.alertRef.message = msg;
            this.alertRef.type = 'error';
            this.alertRef.show();
          }
        }, 0);
      },
    });
  }

  backToLogin(): void {
    this.router.navigate(["/login"]);
  }
}
