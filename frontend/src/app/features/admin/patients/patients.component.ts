import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../shared/sidebar';
import { HeaderComponent } from '../shared/header';

interface Patient {
  id: string;
  initials: string;
  name: string;
  age: number;
  gender: string;
  condition: string;
  lastVisit: string;
  status: string;
}

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.css']
})
export class PatientsComponent implements OnInit {
  patients: Patient[] = [];

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
    // Load patients from backend API
    this.patients = [
      { id: '1', initials: 'SJ', name: 'Sarah Johnson', age: 34, gender: 'Female', condition: 'Hypertension', lastVisit: '2024-01-10', status: 'active' },
      { id: '2', initials: 'JW', name: 'James Wilson', age: 45, gender: 'Male', condition: 'Diabetes Type 2', lastVisit: '2024-01-08', status: 'active' },
      { id: '3', initials: 'MG', name: 'Maria Garcia', age: 28, gender: 'Female', condition: 'Asthma', lastVisit: '2024-01-05', status: 'active' },
      { id: '4', initials: 'RB', name: 'Robert Brown', age: 52, gender: 'Male', condition: 'Arthritis', lastVisit: '2023-12-28', status: 'inactive' }
    ];
  }
}
