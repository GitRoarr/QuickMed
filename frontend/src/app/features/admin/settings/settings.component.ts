import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminShellComponent } from '../shared/admin-shell';
import { AdminService } from '../../../core/services/admin.service';
import { AdminThemeService, Theme } from '@core/services/admin-theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AdminShellComponent, DatePipe],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
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
    if (current) this.themeService.applyTheme(current);
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
    const current = this.themeService.currentTheme();
    if (current) this.themeService.applyTheme(current);
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
      this.currentTheme.set(rawTheme);
      this.themeForm.patchValue({
        name: rawTheme.name || '',
        primaryColor: rawTheme.primaryColor,
        secondaryColor: rawTheme.primaryHover, // Map to secondaryColor in form
        accentColor: rawTheme.statusConfirmed, // Map to accentColor in form
        backgroundColor: rawTheme.backgroundLight,
        textColor: rawTheme.textDark,
        borderColor: rawTheme.borderColor,
        primaryHover: rawTheme.primaryHover
      });
    }
  }

  saveTheme() {
    if (this.themeForm.invalid) {
      this.themeForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const formValue = this.themeForm.value;
    const primaryLight = this.lightenHex(formValue.primaryColor, 0.82);
    const textMuted = this.lightenHex(formValue.textColor, 0.35);

    const themeData: Partial<Theme> = {
      name: formValue.name,
      mode: this.isDarkMode() ? 'dark' : 'light',
      primaryColor: formValue.primaryColor,
      primaryHover: formValue.primaryHover,
      primaryLight,
      backgroundLight: formValue.backgroundColor,
      sidebarBg: formValue.backgroundColor,
      backgroundGray: formValue.backgroundColor,
      textDark: formValue.textColor,
      textGray: formValue.textColor,
      textMuted,
      borderColor: formValue.borderColor,
      cardShadow: '0 2px 5px rgba(0, 0, 0, 0.08)',
      statusConfirmed: formValue.accentColor,
      statusPending: '#f97316',
      statusCompleted: '#3b82f6',
      statusCancelled: '#ef4444'
    };

    if (this.currentTheme()?.id) {
      this.adminService.updateTheme(this.currentTheme()!.id, themeData).subscribe({
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
    const formValue = this.themeForm.value;
    const primaryLight = this.lightenHex(formValue.primaryColor, 0.82);
    const textMuted = this.lightenHex(formValue.textColor, 0.35);
    const previewTheme: Theme = {
      id: this.currentTheme()?.id || '',
      name: formValue.name,
      mode: this.isDarkMode() ? 'dark' : 'light',
      primaryColor: formValue.primaryColor,
      primaryHover: formValue.primaryHover,
      primaryLight,
      backgroundLight: formValue.backgroundColor,
      sidebarBg: formValue.backgroundColor,
      backgroundGray: formValue.backgroundColor,
      textDark: formValue.textColor,
      textGray: formValue.textColor,
      textMuted,
      borderColor: formValue.borderColor,
      cardShadow: '0 2px 5px rgba(0, 0, 0, 0.08)',
      statusConfirmed: formValue.accentColor,
      statusPending: '#f97316',
      statusCompleted: '#3b82f6',
      statusCancelled: '#ef4444',
      isActive: this.currentTheme()?.isActive || false,
      createdAt: this.currentTheme()?.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.themeService.applyTheme(previewTheme);
  }

  previewThemeFromList(theme: Theme) {
    this.currentTheme.set(theme);
    this.themeForm.patchValue({
      name: theme.name || '',
      primaryColor: theme.primaryColor,
      secondaryColor: theme.primaryHover,
      accentColor: theme.statusConfirmed,
      backgroundColor: theme.backgroundLight,
      textColor: theme.textDark,
      borderColor: theme.borderColor,
      primaryHover: theme.primaryHover
    });
    this.themeService.applyTheme(theme);
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

  getTabs(): ('theme' | 'general' | 'security' | 'notifications' | 'logs')[] {
    return ['theme', 'general', 'security', 'notifications', 'logs'];
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

  private lightenHex(hex: string, amount: number): string {
    const normalized = this.normalizeHex(hex);
    if (!normalized) return '#ffffff';

    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);

    const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
    const toHex = (value: number) => value.toString(16).padStart(2, '0');

    return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
  }

  private normalizeHex(hex: string): string | null {
    if (!hex) return null;
    const trimmed = hex.trim();
    if (!trimmed.startsWith('#')) return null;

    if (trimmed.length === 4) {
      const r = trimmed[1];
      const g = trimmed[2];
      const b = trimmed[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }

    if (trimmed.length === 7) return trimmed;
    return null;
  }

}
