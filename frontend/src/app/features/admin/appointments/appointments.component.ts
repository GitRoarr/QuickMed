import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar';
import { HeaderComponent } from '../shared/header';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.css']
})
export class AppointmentsComponent implements OnInit {
  menuItems = [
    { label: 'Overview', icon: 'grid', route: '/admin/overview' },
    { label: 'Appointments', icon: 'calendar', route: '/admin/appointments' },
    { label: 'Patients', icon: 'people', route: '/admin/patients' },
    { label: 'Doctors', icon: 'stethoscope', route: '/admin/doctors' },
    { label: 'User Management', icon: 'person-gear', route: '/admin/users' },
    { label: 'Analytics', icon: 'bar-chart', route: '/admin/analytics' },
    { label: 'Settings', icon: 'gear', route: '/admin/settings' }
  ];

  stats = [
    { title: 'Today', value: 5, icon: 'calendar-day', color: 'bg-blue-100 text-blue-600' },
    { title: 'Upcoming', value: 12, icon: 'calendar-week', color: 'bg-purple-100 text-purple-600' },
    { title: 'Completed', value: 28, icon: 'check-circle', color: 'bg-green-100 text-green-600' },
    { title: 'Total', value: 45, icon: 'calendar-check', color: 'bg-indigo-100 text-indigo-600' }
  ];

  appointments = [
    {
      id: 'APT-001',
      patientName: 'John Doe',
      patientId: 'P-1001',
      date: '2023-11-25',
      time: '10:00 AM',
      doctor: 'Dr. Sarah Johnson',
      room: 'Room 101',
      type: 'General Checkup',
      status: 'Scheduled',
      avatar: 'JD'
    },
    // Add more sample appointments as needed
  ];

  // New appointment form
  newAppointment = {
    patientName: '',
    patientId: '',
    date: '',
    time: '',
    doctor: '',
    room: '',
    type: 'General Checkup',
    status: 'Scheduled'
  };

  // Available doctors (you can fetch this from your backend)
  doctors = [
    'Dr. Sarah Johnson',
    'Dr. Michael Chen',
    'Dr. Emily Rodriguez',
    'Dr. David Kim'
  ];

  // Available rooms
  rooms = ['Room 101', 'Room 102', 'Room 103', 'Room 201', 'Room 202'];

  // Available appointment types
  appointmentTypes = [
    'General Checkup',
    'Follow-up',
    'Consultation',
    'Vaccination',
    'Lab Test',
    'Therapy'
  ];

  constructor(private modalService: NgbModal) {}

  ngOnInit() {
    // Fetch appointments from backend API
    this.fetchAppointments();
  }

  fetchAppointments() {
    // TODO: Implement API call to fetch appointments
    console.log('Fetching appointments...');
  }

  openNewAppointmentModal(content: any) {
    this.modalService.open(content, { size: 'lg' });
  }

  createAppointment() {
    // TODO: Implement API call to create new appointment
    console.log('Creating new appointment:', this.newAppointment);
    this.modalService.dismissAll();
    this.resetForm();
  }

  private resetForm() {
    this.newAppointment = {
      patientName: '',
      patientId: '',
      date: '',
      time: '',
      doctor: '',
      room: '',
      type: 'General Checkup',
      status: 'Scheduled'
    };
  }
}
