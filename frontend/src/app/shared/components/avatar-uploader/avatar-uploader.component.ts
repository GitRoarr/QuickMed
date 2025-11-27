import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '@core/services/user.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-avatar-uploader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-uploader.component.html',
  styleUrls: ['./avatar-uploader.component.css']
})
export class AvatarUploaderComponent {
  @Input() userId!: string;
  @Input() avatarUrl?: string;

  isUploading = signal(false);

  constructor(private userService: UserService, private authService: AuthService) {}

  onSelectFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file || !this.userId) return;

    this.isUploading.set(true);
    this.userService.updateAvatar(this.userId, file).subscribe({
      next: (user) => {
        // update stored user in auth service so UI updates across app
        this.authService.setUser(user as any);
        this.isUploading.set(false);
      },
      error: (err) => {
        console.error('Avatar upload failed', err);
        this.isUploading.set(false);
      },
    });
  }

  triggerFileInput(fileInput: HTMLInputElement) {
    fileInput.click();
  }
}
