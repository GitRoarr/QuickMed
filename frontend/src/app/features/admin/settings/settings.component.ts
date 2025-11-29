import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar';
import { HeaderComponent } from '../shared/header';
import { AdminThemeService, Theme } from 'src/app/core/services/admin-theme.service';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, HeaderComponent, DatePipe],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  menuItems = [
    { label: 'Overview', icon: 'grid', route: '/admin/overview' },
    { label: 'Appointments', icon: 'calendar', route: '/admin/appointments' },
    { label: 'Patients', icon: 'people', route: '/admin/patients' },
    { label: 'Doctors', icon: 'stethoscope', route: '/admin/doctors' },
    { label: 'Receptionists', icon: 'headset', route: '/admin/receptionists' },
    { label: 'User Management', icon: 'person-gear', route: '/admin/users' },
    { label: 'Analytics', icon: 'bar-chart', route: '/admin/analytics' },
    { label: 'Settings', icon: 'gear', route: '/admin/settings' }
  ];

  themeService = inject(AdminThemeService);
  adminService = inject(AdminService);
  fb = inject(FormBuilder);

  activeTab = signal<'theme' | 'general' | 'security' | 'notifications' | 'logs'>('theme');
  isDarkMode = signal(false);
  themes = signal<Theme[]>([]);
  currentTheme = signal<Theme | null>(null);
  loading = signal(false);
  saving = signal(false);
  message = signal<{ type: 'success' | 'error', text: string } | null>(null);

  themeForm: FormGroup;
  generalForm: FormGroup;

  constructor() {
    this.themeForm = this.fb.group({
      name: ['', Validators.required],
      primaryColor: ['#10b981', Validators.required],
      secondaryColor: ['#059669', Validators.required],
      accentColor: ['#3b82f6', Validators.required],
      backgroundColor: ['#ffffff', Validators.required],
      textColor: ['#1f2937', Validators.required],
      borderColor: ['#e5e7eb', Validators.required],
      primaryHover: ['#059669', Validators.required]
    });

    this.generalForm = this.fb.group({
      clinicName: ['QuickMed', Validators.required],
      clinicEmail: ['admin@quickmed.com', [Validators.required, Validators.email]],
      clinicPhone: ['+251 911 234 567', Validators.required],
      timezone: ['Africa/Addis_Ababa', Validators.required],
      dateFormat: ['DD/MM/YYYY', Validators.required],
      currency: ['ETB', Validators.required]
    });
  }

  ngOnInit(): void {
    const current = this.themeService.currentTheme();
    if (current) this.themeService.applyTheme(this.normalizeTheme(current));
    this.loadThemes();
    this.loadCurrentTheme();
    this.checkDarkMode();
  }

  checkDarkMode() {
    const isDark = document.documentElement.classList.contains('dark') ||
                   localStorage.getItem('darkMode') === 'true';
    this.isDarkMode.set(isDark);
  }

  toggleDarkMode() {
    const newMode = !this.isDarkMode();
    this.isDarkMode.set(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
    if (this.themeService.currentTheme())
      this.themeService.applyTheme(this.normalizeTheme(this.themeService.currentTheme()!));
  }

  loadThemes() {
    this.loading.set(true);
    this.adminService.getAllThemes().subscribe({
      next: (themes) => {
        this.themes.set(themes);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadCurrentTheme() {
    const rawTheme = this.themeService.currentTheme();
    if (rawTheme) {
      const theme = this.normalizeTheme(rawTheme);
      this.currentTheme.set(theme);
      this.themeForm.patchValue({
        name: theme.name || '',
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        accentColor: theme.accentColor,
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor,
        borderColor: theme.borderColor,
        primaryHover: theme.primaryHover
      });
    }
  }

  saveTheme() {
    if (this.themeForm.invalid) {
      this.themeForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const themeData = this.themeForm.value;

    if (this.currentTheme()?.id) {
      this.adminService.updateTheme(this.currentTheme()!.id!, themeData).subscribe({
        next: () => {
          this.message.set({ type: 'success', text: 'Theme updated successfully!' });
          this.loadThemes();
          this.themeService.loadTheme();
          this.saving.set(false);
          setTimeout(() => this.message.set(null), 3000);
        },
        error: (err) => {
          this.message.set({ type: 'error', text: err.error?.message || 'Failed to update theme' });
          this.saving.set(false);
        }
      });
    } else {
      this.adminService.createTheme(themeData).subscribe({
        next: () => {
          this.message.set({ type: 'success', text: 'Theme created successfully!' });
          this.loadThemes();
          this.saving.set(false);
          setTimeout(() => this.message.set(null), 3000);
        },
        error: (err) => {
          this.message.set({ type: 'error', text: err.error?.message || 'Failed to create theme' });
          this.saving.set(false);
        }
      });
    }
  }

  activateTheme(theme: Theme) {
    if (!theme.id) return;
    this.adminService.setActiveTheme(theme.id).subscribe({
      next: () => {
        this.message.set({ type: 'success', text: 'Theme activated successfully!' });
        this.loadThemes();
        this.themeService.loadTheme();
        setTimeout(() => this.message.set(null), 3000);
      },
      error: (err) => {
        this.message.set({ type: 'error', text: err.error?.message || 'Failed to activate theme' });
      }
    });
  }

  deleteTheme(themeId: string) {
    if (!confirm('Are you sure you want to delete this theme?')) return;
    this.adminService.deleteTheme(themeId).subscribe({
      next: () => {
        this.message.set({ type: 'success', text: 'Theme deleted successfully!' });
        this.loadThemes();
        setTimeout(() => this.message.set(null), 3000);
      },
      error: (err) => {
        this.message.set({ type: 'error', text: err.error?.message || 'Failed to delete theme' });
      }
    });
  }

  previewTheme() {
    this.themeService.applyTheme(this.normalizeTheme(this.themeForm.value));
  }

  resetTheme() {
    this.themeForm.reset({
      name: '',
      primaryColor: '#10b981',
      secondaryColor: '#059669',
      accentColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      borderColor: '#e5e7eb',
      primaryHover: '#059669'
    });
  }

  setActiveTab(tab: 'theme' | 'general' | 'security' | 'notifications' | 'logs') {
    this.activeTab.set(tab);
  }

  getTabIcon(tab: string): string {
    const icons: { [key: string]: string } = {
      theme: 'bi-palette',
      general: 'bi-gear',
      security: 'bi-shield-lock',
      notifications: 'bi-bell',
      logs: 'bi-file-text'
    };
    return icons[tab] || 'bi-circle';
  }

  getTabLabel(tab: string): string {
    const labels: { [key: string]: string } = {
      theme: 'Theme',
      general: 'General',
      security: 'Security',
      notifications: 'Notifications',
      logs: 'Logs'
    };
    return labels[tab] || tab;
  }

  getLogs() {
    return [
      { time: new Date(), level: 'info', message: 'System initialized successfully' },
      { time: new Date(Date.now() - 60000), level: 'success', message: 'Theme updated: Dark Mode' },
      { time: new Date(Date.now() - 120000), level: 'warning', message: 'High appointment volume detected' },
      { time: new Date(Date.now() - 300000), level: 'info', message: 'User authentication successful' }
    ];
  }

  private normalizeTheme(t: any): Theme {
    return {
      id: t?.id ?? null,
      name: t?.name ?? '',
      primaryColor: t?.primaryColor ?? '#10b981',
      secondaryColor: t?.secondaryColor ?? '#059669',
      accentColor: t?.accentColor ?? '#3b82f6',
      backgroundColor: t?.backgroundColor ?? '#ffffff',
      textColor: t?.textColor ?? '#1f2937',
      borderColor: t?.borderColor ?? '#e5e7eb',
      primaryHover: t?.primaryHover ?? '#059669',
      isActive: !!t?.isActive
    } as Theme;
  }
}
