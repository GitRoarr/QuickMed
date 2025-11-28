import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar';
import { HeaderComponent } from '../shared/header';
import { AdminService } from '@app/core/services/admin.service';
import { AlertMessageComponent } from '@app/shared/components/alert-message/alert-message.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent, AlertMessageComponent],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  menuItems = [
    { label: 'Overview', icon: 'grid', route: '/admin/overview' },
    { label: 'Appointments', icon: 'calendar', route: '/admin/appointments' },
    { label: 'Patients', icon: 'people', route: '/admin/patients' },
    { label: 'Doctors', icon: 'stethoscope', route: '/admin/doctors' },
    { label: 'User Management', icon: 'person-gear', route: '/admin/users' },
    { label: 'Analytics', icon: 'bar-chart', route: '/admin/analytics' },
    { label: 'Settings', icon: 'gear', route: '/admin/settings' }
  ];

  ngOnInit() {
    // Load all users from backend API with role filtering
  }

  private readonly adminService = inject(AdminService)

  // receptionist create form
  recFirst = signal('')
  recLast = signal('')
  recEmail = signal('')
  recPhone = signal('')
  recMessage = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  createReceptionist(): void {
    const first = this.recFirst().trim()
    const last = this.recLast().trim()
    const email = this.recEmail().trim()
    const phone = this.recPhone().trim()
    if (!first || !last || !email) {
      this.recMessage.set({ type: 'error', text: 'First name, last name and email are required.' })
      return
    }

    const payload: any = {
      firstName: first,
      lastName: last,
      email,
      phoneNumber: phone,
      role: 'receptionist',
    }

    this.adminService.createUser(payload).subscribe({
      next: (res) => {
        this.recMessage.set({ type: 'success', text: `Receptionist ${first} ${last} created. Temporary password sent.` })
        this.recFirst.set('')
        this.recLast.set('')
        this.recEmail.set('')
        this.recPhone.set('')
      },
      error: (err) => {
        console.error('Create receptionist failed', err)
        this.recMessage.set({ type: 'error', text: err.error?.message || 'Failed to create receptionist' })
      }
    })
  }

  // Generic create-user modal
  showCreate = signal(false)
  userFirst = signal('')
  userLast = signal('')
  userEmail = signal('')
  userPhone = signal('')
  userRole = signal<'patient' | 'doctor' | 'receptionist' | 'admin'>('receptionist')
  userSpecialty = signal('')
  userLicense = signal('')
  userMessage = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  openCreateModal(role?: 'patient' | 'doctor' | 'receptionist' | 'admin') {
    if (role) this.userRole.set(role)
    this.showCreate.set(true)
    this.userMessage.set(null)
  }

  closeCreateModal() {
    this.showCreate.set(false)
    this.userFirst.set('')
    this.userLast.set('')
    this.userEmail.set('')
    this.userPhone.set('')
    this.userSpecialty.set('')
    this.userLicense.set('')
  }

  createUser(): void {
    const first = this.userFirst().trim()
    const last = this.userLast().trim()
    const email = this.userEmail().trim()
    const phone = this.userPhone().trim()
    const role = this.userRole()

    if (!first || !last || !email) {
      this.userMessage.set({ type: 'error', text: 'First name, last name and email are required.' })
      return
    }

    const payload: any = {
      firstName: first,
      lastName: last,
      email,
      phoneNumber: phone,
      role,
    }

    // Add optional doctor fields
    if (role === 'doctor') {
      if (this.userSpecialty()) payload.specialty = this.userSpecialty()
      if (this.userLicense()) payload.licenseNumber = this.userLicense()
    }

    this.adminService.createUser(payload).subscribe({
      next: (res) => {
        this.userMessage.set({ type: 'success', text: `User ${first} ${last} created as ${role}. Temporary credentials sent if applicable.` })
        this.closeCreateModal()
      },
      error: (err) => {
        console.error('Create user failed', err)
        this.userMessage.set({ type: 'error', text: err.error?.message || 'Failed to create user' })
      }
    })
  }
}

