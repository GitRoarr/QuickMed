import { Component, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { AuthService } from "@core/services/auth.service";
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';

@Component({
    selector: "app-reset-password",
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, AlertMessageComponent],
    templateUrl: "./reset-password.component.html",
    styleUrls: ["./reset-password.component.css"],
})
export class ResetPasswordComponent implements OnInit {
    resetPasswordForm: FormGroup;
    errorMessage = "";
    successMessage = "";
    isLoading = false;
    isCompleted = false;
    token = "";
    email = "";
    showPassword = false;
    showConfirmPassword = false;

    @ViewChild('alert') alertRef?: AlertMessageComponent;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.resetPasswordForm = this.fb.group({
            password: ["", [Validators.required, Validators.minLength(8)]],
            confirmPassword: ["", [Validators.required]],
        }, { validator: this.passwordMatchValidator });
    }

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParamMap.get('token') || '';
        this.email = this.route.snapshot.queryParamMap.get('email') || '';

        if (!this.token || !this.email) {
            this.errorMessage = "Invalid or missing password reset link. Please request a new one.";
            setTimeout(() => {
                if (this.alertRef) {
                    this.alertRef.message = this.errorMessage;
                    this.alertRef.type = 'error';
                    this.alertRef.show();
                }
            }, 0);
        }
    }

    passwordMatchValidator(g: FormGroup) {
        return g.get('password')?.value === g.get('confirmPassword')?.value
            ? null : { 'mismatch': true };
    }

    onSubmit(): void {
        if (this.resetPasswordForm.invalid || !this.token || !this.email) {
            return;
        }

        this.isLoading = true;
        this.errorMessage = "";
        this.successMessage = "";

        const newPassword = this.resetPasswordForm.get('password')?.value;

        this.authService.resetPassword(this.email, this.token, newPassword).subscribe({
            next: () => {
                this.isLoading = false;
                this.isCompleted = true;
                this.successMessage = "Your password has been successfully reset. You can now log in with your new password.";
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
                const msg = error.error?.message || "Failed to reset password. The link may have expired.";
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

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    toggleConfirmPasswordVisibility(): void {
        this.showConfirmPassword = !this.showConfirmPassword;
    }
}
