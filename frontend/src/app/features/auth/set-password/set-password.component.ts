import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './set-password.component.html',
  styleUrls: ['./set-password.component.css']
})
export class SetPasswordComponent implements OnInit {
  form: FormGroup;
  token: string = '';
  uid: string = '';
  message: string = '';
  type: 'success' | 'error' | '' = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      this.uid = params['uid'] || '';
      
      if (!this.token || !this.uid) {
        this.message = 'Invalid invitation link. Please contact the administrator.';
        this.type = 'error';
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit() {
    if (this.form.invalid || !this.token || !this.uid) {
      this.message = 'Please fill in all fields correctly.';
      this.type = 'error';
      return;
    }

    this.loading = true;
    this.message = '';

    // Try doctor endpoint first, then receptionist
    const payload = {
      uid: this.uid,
      token: this.token,
      password: this.form.value.password
    };

    // Try doctor endpoint first
    this.http.post(`${environment.apiUrl}/doctors/set-password`, payload).subscribe({
      next: () => {
        this.type = 'success';
        this.message = 'Password set successfully! You can now log in.';
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (doctorErr) => {
        // If doctor endpoint fails, try receptionist endpoint
        this.http.post(`${environment.apiUrl}/receptionist/set-password`, payload).subscribe({
          next: () => {
            this.type = 'success';
            this.message = 'Password set successfully! You can now log in.';
            this.loading = false;
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          },
          error: (receptionistErr) => {
            this.type = 'error';
            this.message = receptionistErr.error?.message || doctorErr.error?.message || 'Failed to set password. The link may have expired.';
            this.loading = false;
            console.error('Error setting password:', receptionistErr);
          }
        });
      }
    });
  }
}

