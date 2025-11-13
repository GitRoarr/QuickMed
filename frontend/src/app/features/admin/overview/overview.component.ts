import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../shared/sidebar';
import { HeaderComponent } from '../shared/header';

interface StatCard {
  label: string;
  value: string;
  change: string;
  icon: string;
}

interface DoctorSchedule {
  initials: string;
  name: string;
  specialty: string;
  schedule: string;
  status: string;
  patientCount: number;
}

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent implements OnInit {
  stats = signal<StatCard[]>([]);
  doctorSchedules = signal<DoctorSchedule[]>([]);

  menuItems = [
    { label: 'Overview', icon: 'grid', route: '/admin/overview' },
    { label: 'Appointments', icon: 'calendar', route: '/admin/appointments' },
    { label: 'Patients', icon: 'people', route: '/admin/patients' },
    { label: 'Doctors', icon: 'stethoscope', route: '/admin/doctors' },
    { label: 'User Management', icon: 'person-gear', route: '/admin/users' },
    { label: 'Analytics', icon: 'bar-chart', route: '/admin/analytics' },
    { label: 'Settings', icon: 'gear', route: '/admin/settings' }
  ];

  ngOnInit(): void {
    this.loadStats();
    this.loadDoctorSchedules();
  }

  private loadStats(): void {
    // Fetch stats from backend API
    this.stats.set([
      { label: 'Total Appointments', value: '1,284', change: '+18.2% from last month', icon: '📅' },
      { label: 'Total Patients', value: '892', change: '+23.1% from last month', icon: '👥' },
      { label: 'Revenue', value: '$48,392', change: '+23.1% from last month', icon: '💵' },
      { label: 'Pending', value: '24', change: '-4.3% from last month', icon: '⏱️' },
      { label: 'Completed Today', value: '18', change: '+6.1% from last month', icon: '✅' },
      { label: 'Avg. Wait Time', value: '12 min', change: '-2.4% from last month', icon: '📈' }
    ]);
  }

  private loadDoctorSchedules(): void {
    // Fetch doctor schedules from backend API
    this.doctorSchedules.set([
      { initials: 'MI', name: 'Dr. Michael Chen', specialty: 'Cardiology', schedule: '08:00 AM - 04:00 PM', status: 'Active', patientCount: 12 },
      { initials: 'EM', name: 'Dr. Emily Rodriguez', specialty: 'Pediatrics', schedule: '09:00 AM - 05:00 PM', status: 'Active', patientCount: 15 },
      { initials: 'SA', name: 'Dr. Sarah Thompson', specialty: 'Orthopedics', schedule: '10:00 AM - 06:00 PM', status: 'Active', patientCount: 8 },
      { initials: 'JA', name: 'Dr. James Wilson', specialty: 'Dermatology', schedule: '01:00 PM - 09:00 PM', status: 'Scheduled', patientCount: 10 }
    ]);
  }
}
