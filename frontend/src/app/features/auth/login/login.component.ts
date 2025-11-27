import { Component, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "@core/services/auth.service";
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AlertMessageComponent],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage = "";
  isLoading = false;
  @ViewChild('alert') alertRef?: AlertMessageComponent;

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
        const msg = error.error?.message || "Invalid email or password";
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

  resetForm(): void {
    this.loginForm.reset();
    this.errorMessage = "";
  }
}
