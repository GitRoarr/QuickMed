import { Component, ViewChild } from "@angular/core"
import { CommonModule } from "@angular/common"
import {  FormBuilder,  FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import {  Router, RouterLink } from "@angular/router"
import  { AuthService } from "@core/services/auth.service"
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';

@Component({
  selector: "app-register",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AlertMessageComponent],
  templateUrl: "./register.component.html",
  styleUrls: ["./register.component.css"],
})
export class RegisterComponent {
  registerForm: FormGroup
  errorMessage = ""
  isLoading = false
  @ViewChild('alert') alertRef?: AlertMessageComponent;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
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
        // show success alert then navigate
        setTimeout(() => {
          if (this.alertRef) {
            this.alertRef.message = 'Account created successfully';
            this.alertRef.type = 'success';
            this.alertRef.show();
            // navigate after short delay so user sees message
            setTimeout(() => this.router.navigate(["/patient/dashboard"]), 900);
          } else {
            this.router.navigate(["/patient/dashboard"])
          }
        }, 0);
      },
      error: (error) => {
        this.isLoading = false
        const msg = error.error?.message || "Registration failed. Please try again.";
        this.errorMessage = msg
        setTimeout(() => {
          if (this.alertRef) {
            this.alertRef.message = msg;
            this.alertRef.type = 'error';
            this.alertRef.show();
          }
        }, 0);
      },
    })
  }
}
