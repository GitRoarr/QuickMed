import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminShellComponent } from '../shared/admin-shell';
import { AdminService, User } from '@app/core/services/admin.service';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent, AlertMessageComponent, NgbModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  menuItems = [
    { label: 'Overview', icon: 'grid', route: '/admin/overview' },
    { label: 'Appointments', icon: 'calendar', route: '/admin/appointments' },
    { label: 'Patients', icon: 'people', route: '/admin/patients' },
    { label: 'Doctors', icon: 'stethoscope', route: '/admin/doctors' },
    { label: 'User Management', icon: 'person-gear', route: '/admin/users' },
    { label: 'Analytics', icon: 'bar-chart', route: '/admin/analytics' },
    { label: 'Settings', icon: 'gear', route: '/admin/settings' }
  ];

  private readonly adminService = inject(AdminService);
  private readonly modalService = inject(NgbModal);
  private searchSubject = new Subject<string>();

  // Data
  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  isLoading = signal(false);

  // Stats
  totalUsers = signal(0);
  totalPatients = signal(0);
  totalDoctors = signal(0);
  totalAdmins = signal(0);
  totalReceptionists = signal(0);
  activeUsers = signal(0);
  inactiveUsers = signal(0);

  // Filters
  searchQuery = signal('');
  selectedRole = signal<string>('all');
  selectedStatus = signal<string>('all');
  currentPage = signal(1);
  pageSize = signal(10);
  totalPages = signal(1);

  // Create User Modal
  showCreate = signal(false);
  userFirst = signal('');
  userLast = signal('');
  userEmail = signal('');
  userPhone = signal('');
  userRole = signal<'patient' | 'doctor' | 'receptionist' | 'admin'>('receptionist');
  userSpecialty = signal('');
  userLicense = signal('');
  userMessage = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Edit User Modal
  showEdit = signal(false);
  editingUser = signal<User | null>(null);
  editFirst = signal('');
  editLast = signal('');
  editEmail = signal('');
  editPhone = signal('');
  editRole = signal<'patient' | 'doctor' | 'receptionist' | 'admin'>('patient');
  editSpecialty = signal('');
  editLicense = signal('');
  editIsActive = signal(true);
  editMessage = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Delete Confirmation
  showDeleteConfirm = signal(false);
  deletingUser = signal<User | null>(null);

  // Reset Password
  showResetPassword = signal(false);
  resettingUser = signal<User | null>(null);
  newPassword = signal('');
  resetPasswordMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk Actions
  selectedUsers = signal<Set<string>>(new Set());

  // User Menu
  showUserMenu = signal<string | null>(null);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.showUserMenu.set(null);
    }
  }

  ngOnInit() {
    this.loadUsers();

    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage.set(1);
      this.loadUsers();
    });
  }

  ngOnDestroy() {
    this.searchSubject.complete();
  }

  loadUsers() {
    this.isLoading.set(true);
    const role = this.selectedRole() !== 'all' ? this.selectedRole() : undefined;
    const search = this.searchQuery().trim() || undefined;

    // Load all users for stats (with large limit)
    this.adminService.getAllUsers(1, 1000, undefined, undefined).subscribe({
      next: (allUsersResponse) => {
        // Calculate stats from all users
        this.calculateStatsFromUsers(allUsersResponse.data);

        // Now load paginated/filtered users
        this.adminService.getAllUsers(this.currentPage(), this.pageSize(), role, search).subscribe({
          next: (response) => {
            this.users.set(response.data);
            this.totalUsers.set(response.total);
            this.totalPages.set(response.totalPages);
            this.applyFilters();
            this.isLoading.set(false);
          },
          error: (error) => {
            console.error('Error loading users:', error);
            this.isLoading.set(false);
            this.userMessage.set({ type: 'error', text: 'Failed to load users' });
          }
        });
      },
      error: (error) => {
        console.error('Error loading all users for stats:', error);
        // Still try to load paginated users
        this.adminService.getAllUsers(this.currentPage(), this.pageSize(), role, search).subscribe({
          next: (response) => {
            this.users.set(response.data);
            this.totalUsers.set(response.total);
            this.totalPages.set(response.totalPages);
            this.applyFilters();
            this.isLoading.set(false);
          },
          error: (err) => {
            this.isLoading.set(false);
            this.userMessage.set({ type: 'error', text: 'Failed to load users' });
          }
        });
      }
    });
  }

  calculateStatsFromUsers(allUsers: User[]) {
    this.totalUsers.set(allUsers.length);
    this.totalPatients.set(allUsers.filter(u => u.role === 'patient').length);
    this.totalDoctors.set(allUsers.filter(u => u.role === 'doctor').length);
    this.totalAdmins.set(allUsers.filter(u => u.role === 'admin').length);
    this.totalReceptionists.set(allUsers.filter(u => u.role === 'receptionist').length);
    this.activeUsers.set(allUsers.filter(u => u.isActive).length);
    this.inactiveUsers.set(allUsers.filter(u => !u.isActive).length);
  }


  applyFilters() {
    let filtered = [...this.users()];

    // Filter by role
    if (this.selectedRole() !== 'all') {
      filtered = filtered.filter(u => u.role === this.selectedRole());
    }

    // Filter by status
    if (this.selectedStatus() !== 'all') {
      if (this.selectedStatus() === 'active') {
        filtered = filtered.filter(u => u.isActive);
      } else if (this.selectedStatus() === 'inactive') {
        filtered = filtered.filter(u => !u.isActive);
      }
    }

    // Apply search filter
    const searchTerm = this.searchQuery().toLowerCase().trim();
    if (searchTerm) {
      filtered = filtered.filter(u => {
        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        const phone = (u.phoneNumber || '').toLowerCase();
        const patientId = (u.patientId || '').toLowerCase();

        return fullName.includes(searchTerm) ||
          email.includes(searchTerm) ||
          phone.includes(searchTerm) ||
          patientId.includes(searchTerm);
      });
    }

    this.filteredUsers.set(filtered);
  }

  onSearchChange() {
    this.searchSubject.next(this.searchQuery());
  }

  onRoleChange() {
    this.currentPage.set(1);
    this.loadUsers();
  }

  onStatusChange() {
    this.applyFilters();
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadUsers();
  }

  // Create User
  openCreateModal(role?: 'patient' | 'doctor' | 'receptionist' | 'admin') {
    if (role) this.userRole.set(role);
    this.showCreate.set(true);
    this.userMessage.set(null);
    this.resetCreateForm();
  }

  closeCreateModal() {
    this.showCreate.set(false);
    this.resetCreateForm();
  }

  resetCreateForm() {
    this.userFirst.set('');
    this.userLast.set('');
    this.userEmail.set('');
    this.userPhone.set('');
    this.userSpecialty.set('');
    this.userLicense.set('');
    this.userMessage.set(null);
  }

  createUser(): void {
    const first = this.userFirst().trim();
    const last = this.userLast().trim();
    const email = this.userEmail().trim();
    const phone = this.userPhone().trim();
    const role = this.userRole();

    if (!first || !last || !email) {
      this.userMessage.set({ type: 'error', text: 'First name, last name and email are required.' });
      return;
    }

    const payload: any = {
      firstName: first,
      lastName: last,
      email,
      phoneNumber: phone || undefined,
      role,
    };

    // Add optional doctor fields
    if (role === 'doctor') {
      if (this.userSpecialty()) payload.specialty = this.userSpecialty();
      if (this.userLicense()) payload.licenseNumber = this.userLicense();
    }

    this.adminService.createUser(payload).subscribe({
      next: (res) => {
        this.userMessage.set({ type: 'success', text: `User ${first} ${last} created as ${role}. Temporary credentials sent if applicable.` });
        this.closeCreateModal();
        this.loadUsers();
      },
      error: (err) => {
        console.error('Create user failed', err);
        this.userMessage.set({ type: 'error', text: err.error?.message || 'Failed to create user' });
      }
    });
  }

  // Edit User
  openEditModal(user: User) {
    this.editingUser.set(user);
    this.editFirst.set(user.firstName);
    this.editLast.set(user.lastName);
    this.editEmail.set(user.email);
    this.editPhone.set(user.phoneNumber || '');
    this.editRole.set(user.role);
    this.editSpecialty.set(user.specialty || '');
    this.editLicense.set(user.licenseNumber || '');
    this.editIsActive.set(user.isActive);
    this.editMessage.set(null);
    this.showEdit.set(true);
  }

  closeEditModal() {
    this.showEdit.set(false);
    this.editingUser.set(null);
    this.editMessage.set(null);
  }

  updateUser(): void {
    const user = this.editingUser();
    if (!user) return;

    const first = this.editFirst().trim();
    const last = this.editLast().trim();
    const email = this.editEmail().trim();
    const phone = this.editPhone().trim();

    if (!first || !last || !email) {
      this.editMessage.set({ type: 'error', text: 'First name, last name and email are required.' });
      return;
    }

    const payload: any = {
      firstName: first,
      lastName: last,
      email,
      phoneNumber: phone || undefined,
      isActive: this.editIsActive(),
    };

    // Add optional doctor fields
    if (this.editRole() === 'doctor') {
      if (this.editSpecialty()) payload.specialty = this.editSpecialty();
      if (this.editLicense()) payload.licenseNumber = this.editLicense();
    }

    this.adminService.updateUser(user.id, payload).subscribe({
      next: (res) => {
        this.editMessage.set({ type: 'success', text: `User ${first} ${last} updated successfully.` });
        this.closeEditModal();
        this.loadUsers();
      },
      error: (err) => {
        console.error('Update user failed', err);
        this.editMessage.set({ type: 'error', text: err.error?.message || 'Failed to update user' });
      }
    });
  }

  // Delete User
  openDeleteConfirm(user: User) {
    this.deletingUser.set(user);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm.set(false);
    this.deletingUser.set(null);
  }

  confirmDelete() {
    const user = this.deletingUser();
    if (!user) return;

    this.adminService.deleteUser(user.id).subscribe({
      next: () => {
        this.closeDeleteConfirm();
        this.loadUsers();
        this.userMessage.set({ type: 'success', text: `User ${user.firstName} ${user.lastName} deleted successfully.` });
      },
      error: (err) => {
        console.error('Delete user failed', err);
        this.userMessage.set({ type: 'error', text: err.error?.message || 'Failed to delete user' });
        this.closeDeleteConfirm();
      }
    });
  }

  // Reset Password
  openResetPasswordModal(user: User) {
    this.resettingUser.set(user);
    this.newPassword.set('');
    this.resetPasswordMessage.set(null);
    this.showResetPassword.set(true);
  }

  closeResetPasswordModal() {
    this.showResetPassword.set(false);
    this.resettingUser.set(null);
    this.newPassword.set('');
    this.resetPasswordMessage.set(null);
  }

  resetPassword() {
    const user = this.resettingUser();
    const password = this.newPassword();

    if (!user || !password) {
      this.resetPasswordMessage.set({ type: 'error', text: 'Please enter a new password' });
      return;
    }

    if (password.length < 8) {
      this.resetPasswordMessage.set({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    this.adminService.resetUserPassword(user.id, password).subscribe({
      next: () => {
        this.userMessage.set({ type: 'success', text: `Password for ${user.firstName} ${user.lastName} has been reset.` });
        this.closeResetPasswordModal();
      },
      error: (err) => {
        console.error('Reset password failed', err);
        this.resetPasswordMessage.set({ type: 'error', text: err.error?.message || 'Failed to reset password' });
      }
    });
  }

  // Utility Methods
  getInitials(firstName: string, lastName: string): string {
    const first = firstName?.charAt(0).toUpperCase() || '';
    const last = lastName?.charAt(0).toUpperCase() || '';
    return `${first}${last}`;
  }

  getRoleColor(role: string): string {
    const colors: { [key: string]: string } = {
      'patient': 'green',
      'doctor': 'blue',
      'admin': 'purple',
      'receptionist': 'gray'
    };
    return colors[role] || 'gray';
  }

  getStatusClass(isActive: boolean): string {
    return isActive
      ? 'px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full'
      : 'px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full';
  }

  getRoleClass(role: string): string {
    const classes: { [key: string]: string } = {
      'patient': 'px-2 py-1 text-xs font-semibold text-green-600 bg-green-50 rounded-full',
      'doctor': 'px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full',
      'admin': 'px-2 py-1 text-xs font-semibold text-purple-600 bg-purple-50 rounded-full',
      'receptionist': 'px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-50 rounded-full'
    };
    return classes[role] || classes['receptionist'];
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Bulk Actions
  toggleUserSelection(userId: string) {
    const selected = new Set(this.selectedUsers());
    if (selected.has(userId)) {
      selected.delete(userId);
    } else {
      selected.add(userId);
    }
    this.selectedUsers.set(selected);
  }

  selectAll() {
    const allIds = new Set(this.filteredUsers().map(u => u.id));
    this.selectedUsers.set(allIds);
  }

  deselectAll() {
    this.selectedUsers.set(new Set());
  }

  async bulkDelete() {
    const selected = Array.from(this.selectedUsers());
    if (selected.length === 0) return;

    if (confirm(`Are you sure you want to delete ${selected.length} user(s)?`)) {
      try {
        const deletePromises = selected.map(id =>
          firstValueFrom(this.adminService.deleteUser(id))
        );

        await Promise.all(deletePromises);
        this.loadUsers();
        this.selectedUsers.set(new Set());
        this.userMessage.set({ type: 'success', text: `${selected.length} user(s) deleted successfully.` });
      } catch (err) {
        console.error('Bulk delete failed', err);
        this.userMessage.set({ type: 'error', text: 'Failed to delete some users' });
      }
    }
  }

  async bulkActivate() {
    const selected = Array.from(this.selectedUsers());
    if (selected.length === 0) return;

    try {
      const updatePromises = selected.map(id =>
        firstValueFrom(this.adminService.updateUser(id, { isActive: true }))
      );

      await Promise.all(updatePromises);
      this.loadUsers();
      this.selectedUsers.set(new Set());
      this.userMessage.set({ type: 'success', text: `${selected.length} user(s) activated successfully.` });
    } catch (err) {
      console.error('Bulk activate failed', err);
      this.userMessage.set({ type: 'error', text: 'Failed to activate some users' });
    }
  }

  async bulkDeactivate() {
    const selected = Array.from(this.selectedUsers());
    if (selected.length === 0) return;

    try {
      const updatePromises = selected.map(id =>
        firstValueFrom(this.adminService.updateUser(id, { isActive: false }))
      );

      await Promise.all(updatePromises);
      this.loadUsers();
      this.selectedUsers.set(new Set());
      this.userMessage.set({ type: 'success', text: `${selected.length} user(s) deactivated successfully.` });
    } catch (err) {
      console.error('Bulk deactivate failed', err);
      this.userMessage.set({ type: 'error', text: 'Failed to deactivate some users' });
    }
  }

  // Export
  exportUsers() {
    const users = this.filteredUsers();
    const csv = this.convertToCSV(users);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  convertToCSV(users: User[]): string {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Created At'];
    const rows = users.map(u => [
      `${u.firstName} ${u.lastName}`,
      u.email,
      u.phoneNumber || '',
      u.role,
      u.isActive ? 'Active' : 'Inactive',
      this.formatDate(u.createdAt)
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = total - 4; i <= total; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(total);
      }
    }

    return pages;
  }

  // Modal helpers
  openCreateModalWithTemplate(content: any) {
    this.openCreateModal();
    this.modalService.open(content, { size: 'lg', centered: true });
  }

  openEditModalWithTemplate(user: User, content: any) {
    this.openEditModal(user);
    this.modalService.open(content, { size: 'lg', centered: true });
  }

  openDeleteConfirmWithTemplate(user: User, content: any) {
    this.openDeleteConfirm(user);
    this.modalService.open(content, { size: 'md', centered: true });
  }

  openResetPasswordWithTemplate(user: User, content: any) {
    this.openResetPasswordModal(user);
    this.modalService.open(content, { size: 'md', centered: true });
  }

  getStartIndex(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage() * this.pageSize(), this.totalUsers());
  }
}
