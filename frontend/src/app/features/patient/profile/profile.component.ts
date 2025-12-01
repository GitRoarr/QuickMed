import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientShellComponent } from '../shared/patient-shell/patient-shell.component';
import { AuthService } from '@core/services/auth.service';
import { UserService } from '@core/services/user.service';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, PatientShellComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  user = signal(this.authService.currentUser());

  ngOnInit(): void {
    const current = this.authService.currentUser();
    if (current?.id) {
      this.userService.getOne(current.id).subscribe({
        next: (u) => {
          this.user.set(u);
          this.authService.setUser(u);
        },
      });
    }
  }
}

