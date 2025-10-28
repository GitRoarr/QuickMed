import { Component, OnInit, OnDestroy, HostListener } from "@angular/core"
import { CommonModule } from "@angular/common"
import {FormBuilder,FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import {Router, RouterLink } from "@angular/router"
import{ AuthService } from "@core/services/auth.service"

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup
  errorMessage = ""
  isLoading = false
  showAdminLogin = false
  adminKeySequence: string[] = []
  adminSequence = ['a', 'd', 'm', 'i', 'n']
  keySequenceTimeout: any

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

  ngOnInit() {
    this.setupKeyboardShortcuts()
  }

  ngOnDestroy() {
    if (this.keySequenceTimeout) {
      clearTimeout(this.keySequenceTimeout)
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key.toLowerCase() === this.adminSequence[this.adminKeySequence.length]) {
      this.adminKeySequence.push(event.key.toLowerCase())
      
      if (this.keySequenceTimeout) {
        clearTimeout(this.keySequenceTimeout)
      }
      
      this.keySequenceTimeout = setTimeout(() => {
        this.adminKeySequence = []
      }, 2000)
      
      if (this.adminKeySequence.length === this.adminSequence.length) {
        this.showAdminLogin = true
        this.adminKeySequence = []
        this.showAdminLoginNotification()
      }
    } else {
      this.adminKeySequence = []
    }

    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'enter':
          event.preventDefault()
          this.onSubmit()
          break
        case 'r':
          event.preventDefault()
          this.resetForm()
          break
        case 'a':
          event.preventDefault()
          this.showAdminLogin = !this.showAdminLogin
          break
      }
    }
  }

  setupKeyboardShortcuts() {
    console.log('Keyboard shortcuts available:')
    console.log('- Type "admin" to access admin login')
    console.log('- Ctrl/Cmd + Enter: Submit form')
    console.log('- Ctrl/Cmd + R: Reset form')
    console.log('- Ctrl/Cmd + A: Toggle admin login')
  }

  showAdminLoginNotification() {
    const notification = document.createElement('div')
    notification.className = 'admin-login-notification'
    notification.innerHTML = `
      <div class="notification-content">
        <i class="bi bi-shield-check"></i>
        <span>Admin Login Activated!</span>
      </div>
    `
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.remove()
    }, 3000)
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return
    }

    this.isLoading = true
    this.errorMessage = ""

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.isLoading = false
        const user = response.user

        switch (user.role) {
          case "patient":
            this.router.navigate(["/patient/dashboard"])
            break
          case "doctor":
            this.router.navigate(["/doctor/dashboard"])
            break
          case "admin":
            this.router.navigate(["/admin/dashboard"])
            break
          default:
            this.router.navigate(["/"])
        }
      },
      error: (error) => {
        this.isLoading = false
        this.errorMessage = error.error?.message || "Invalid email or password"
      },
    })
  }

  resetForm(): void {
    this.loginForm.reset()
    this.errorMessage = ""
  }

  toggleAdminLogin(): void {
    this.showAdminLogin = !this.showAdminLogin
  }

  getShortcutHint(): string {
    return this.showAdminLogin ? 'Admin login is active' : 'Type "admin" for admin access'
  }
}
