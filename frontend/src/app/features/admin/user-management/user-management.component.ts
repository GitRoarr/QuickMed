import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../shared/sidebar';
import { HeaderComponent } from '../shared/header';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
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
}
