import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeaderComponent } from '@app/features/admin/shared/header';
import { SidebarComponent } from '@app/features/admin/shared/sidebar';
import { AuthService } from '@core/services/auth.service';
import { UserService } from '@core/services/user.service';
import { ThemeService } from '@core/services/theme.service';
import { ToastService } from '@core/services/toast.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-receptionist-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, HeaderComponent, SidebarComponent],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    public readonly authService = inject(AuthService);
    private readonly userService = inject(UserService);
    private readonly toast = inject(ToastService);
    private readonly router = inject(Router);
    themeService = inject(ThemeService);

    activeTab = signal<'profile' | 'security' | 'appearance'>('profile');
    isSaving = signal(false);

    profileForm = this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
        phoneNumber: [''],
        department: [{ value: '', disabled: true }]
    });

    passwordForm = this.fb.group({
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required]
    }, {
        validators: (group) => {
            const pass = group.get('newPassword')?.value;
            const confirm = group.get('confirmPassword')?.value;
            return pass === confirm ? null : { notSame: true };
        }
    });

    menuItems = [
                { label: 'Dashboard', icon: 'bi-speedometer2', route: '/receptionist/dashboard', exact: true },
                { label: 'Appointments', icon: 'bi-calendar-check', route: '/receptionist/appointments' },
                { label: 'Patients', icon: 'bi-people', route: '/receptionist/patients' },
                { label: 'Messages', icon: 'bi-chat-dots', route: '/receptionist/messages' },
                { label: 'Payments', icon: 'bi-cash-stack', route: '/receptionist/payments' },
                { label: 'Doctors',
                    iconImgLight: 'https://img.icons8.com/?size=100&id=60999&format=png&color=000000',
                    iconImgDark: 'https://img.icons8.com/?size=100&id=60999&format=png&color=4e91fd',
                    route: '/receptionist/doctors' },
                { label: 'Reports', icon: 'bi-bar-chart', route: '/receptionist/reports' },
    ];

    secondaryItems = [
        { label: 'Settings', icon: 'bi-gear', route: '/receptionist/settings' },
        { label: 'Logout', icon: 'bi-box-arrow-right', route: '/receptionist/logout' },
    ];

    ngOnInit(): void {
        const user = this.authService.currentUser();
        if (user) {
            this.profileForm.patchValue({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email,
                phoneNumber: user.phoneNumber || '',
                department: (user as any).department || 'Front Desk'
            });
        }
    }

    saveProfile(): void {
        if (this.profileForm.invalid) return;
        const user = this.authService.currentUser();
        if (!user) return;

        this.isSaving.set(true);
        const formValue = this.profileForm.getRawValue();

        this.userService.update(user.id, {
            firstName: formValue.firstName || user.firstName,
            lastName: formValue.lastName || user.lastName,
            phoneNumber: formValue.phoneNumber ?? user.phoneNumber,
            // department update might need special handling if backend allows it here
        }).subscribe({
            next: (updated) => {
                this.authService.setUser(updated);
                this.toast.success('Profile settings updated');
                this.isSaving.set(false);
            },
            error: (err) => {
                this.toast.error(err.error?.message || 'Failed to update profile');
                this.isSaving.set(false);
            }
        });
    }

    changePassword(): void {
        if (this.passwordForm.invalid) return;
        const user = this.authService.currentUser();
        if (!user) return;

        this.isSaving.set(true);
        this.userService.changePassword(user.id, {
            currentPassword: this.passwordForm.value.currentPassword || '',
            newPassword: this.passwordForm.value.newPassword || ''
        }).subscribe({
            next: () => {
                this.passwordForm.reset();
                this.toast.success('Password changed successfully');
                this.isSaving.set(false);
            },
            error: (err) => {
                this.toast.error(err.error?.message || 'Failed to change password');
                this.isSaving.set(false);
            }
        });
    }

    onFileSelected(event: any): void {
        const file = event.target.files?.[0];
        if (!file) return;

        const user = this.authService.currentUser();
        if (!user) return;

        this.isSaving.set(true);
        this.userService.updateAvatar(user.id, file).subscribe({
            next: (updated) => {
                this.authService.setUser(updated);
                this.toast.success('Profile picture updated');
                this.isSaving.set(false);
            },
            error: () => {
                this.toast.error('Failed to upload image');
                this.isSaving.set(false);
            }
        });
    }
}
