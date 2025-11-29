import { Component, OnInit, OnDestroy, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../shared/sidebar';
import { HeaderComponent } from '../shared/header';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { AdminService, Appointment, User } from '../../../core/services/admin.service';
import { AppointmentStatus } from '../../../core/models/appointment.model';
import { AdminThemeService } from '../../../core/services/admin-theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification } from '../../../core/models/notification.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, HeaderComponent, NgbModalModule],
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

  appointments = signal<Appointment[]>([]);
  filteredAppointments = signal<Appointment[]>([]);
  isLoading = signal(false);
  searchQuery = signal('');
  selectedStatus = signal<string>('all');
  selectedDate = signal<string>('');
  selectedDoctor = signal<string>('all');
  selectedPatient = signal<string>('all');
  viewMode = signal<'list' | 'calendar'>('list');
  totalAppointments = signal(0);
  
  // Notification state
  showNotificationDropdown = signal(false);
  notifications = signal<Notification[]>([]);
  unreadCount = signal(0);
  isLoadingNotifications = signal(false);
  
  // Calendar state
  showCalendarModal = signal(false);
  calendarDate = signal(new Date());
  calendarAppointments = signal<{ [key: string]: Appointment[] }>({});
  
  // Search debounce
  private searchSubject = new Subject<string>();
  
  // New appointment form
  showNewAppointmentModal = signal(false);
  newAppointment = signal({
    patientId: '',
    doctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: 'Consultation',
    reason: '',
    location: '',
    isVideoConsultation: false,
    notes: '',
    status: 'pending' as AppointmentStatus
  });

  // Available options
  patients = signal<User[]>([]);
  doctors = signal<User[]>([]);
  appointmentTypes = ['Consultation', 'Follow-up', 'New Patient', 'Video Call', 'Checkup'];
  
  // Map frontend types to backend enum values
  getAppointmentTypeEnum(type: string): string {
    const typeMap: { [key: string]: string } = {
      'Consultation': 'Consultation',
      'Follow-up': 'Follow-up',
      'New Patient': 'New Patient',
      'Video Call': 'Video Call',
      'Checkup': 'Checkup'
    };
    return typeMap[type] || 'Consultation';
  }
  
  alertMessage = signal<{ type: 'success' | 'error', text: string } | null>(null);

  themeService = inject(AdminThemeService);
  notificationService = inject(NotificationService);

  constructor(
    private modalService: NgbModal,
    private adminService: AdminService
  ) {
    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.searchQuery.set(searchTerm);
      this.applyFilters();
    });
  }

  ngOnInit() {
    this.fetchAppointments();
    this.loadPatientsAndDoctors();
    this.loadNotifications();
    this.loadUnreadCount();
    
    // Auto-refresh notifications every 30 seconds
    setInterval(() => {
      this.loadUnreadCount();
    }, 30000);
  }

  ngOnDestroy() {
    this.searchSubject.complete();
  }

  fetchAppointments() {
    this.isLoading.set(true);
    const search = this.searchQuery().trim() || undefined;
    const status = this.selectedStatus() !== 'all' ? this.selectedStatus() : undefined;
    
    this.adminService.getAllAppointments(1, 1000, status, search).subscribe({
      next: (response) => {
        this.appointments.set(response.data);
        this.totalAppointments.set(response.total);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error fetching appointments:', error);
        this.isLoading.set(false);
        this.showAlert('error', 'Failed to load appointments');
      }
    });
  }

  applyFilters() {
    let filtered = [...this.appointments()];
    
    // Filter by status
    if (this.selectedStatus() !== 'all') {
      filtered = filtered.filter(apt => apt.status === this.selectedStatus());
    }
    
    // Filter by date
    if (this.selectedDate()) {
      const selectedDateStr = new Date(this.selectedDate()).toISOString().split('T')[0];
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
        return aptDate === selectedDateStr;
      });
    }
    
    // Filter by doctor
    if (this.selectedDoctor() !== 'all') {
      filtered = filtered.filter(apt => apt.doctorId === this.selectedDoctor());
    }
    
    // Filter by patient
    if (this.selectedPatient() !== 'all') {
      filtered = filtered.filter(apt => apt.patientId === this.selectedPatient());
    }
    
    // Apply search filter
    const searchTerm = this.searchQuery().toLowerCase().trim();
    if (searchTerm) {
      filtered = filtered.filter(apt => {
        const patientName = this.getPatientName(apt).toLowerCase();
        const doctorName = this.getDoctorName(apt).toLowerCase();
        const type = this.getAppointmentType(apt).toLowerCase();
        const reason = (apt.reason || '').toLowerCase();
        const location = (apt.location || '').toLowerCase();
        
        return patientName.includes(searchTerm) ||
               doctorName.includes(searchTerm) ||
               type.includes(searchTerm) ||
               reason.includes(searchTerm) ||
               location.includes(searchTerm);
      });
    }
    
    // Sort by date and time
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.appointmentDate}T${a.appointmentTime}`);
      const dateB = new Date(`${b.appointmentDate}T${b.appointmentTime}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    this.filteredAppointments.set(filtered);
    this.updateCalendarAppointments();
  }

  loadPatientsAndDoctors() {
    // Load patients
    this.adminService.getPatients(1, 200).subscribe({
      next: (response) => {
        this.patients.set(response.data);
      },
      error: (error) => {
        console.error('Error loading patients:', error);
      }
    });

    // Load doctors
    this.adminService.getAllUsers(1, 200, 'doctor').subscribe({
      next: (response) => {
        this.doctors.set(response.data);
      },
      error: (error) => {
        console.error('Error loading doctors:', error);
      }
    });
  }

  onSearchChange() {
    this.searchSubject.next(this.searchQuery());
  }

  onStatusChange() {
    this.applyFilters();
  }

  onDateChange() {
    this.applyFilters();
  }

  onDoctorChange() {
    this.applyFilters();
  }

  onPatientChange() {
    this.applyFilters();
  }

  toggleViewMode() {
    this.viewMode.set(this.viewMode() === 'list' ? 'calendar' : 'list');
  }

  openCalendarView(modalContent?: any) {
    if (modalContent) {
      this.modalService.open(modalContent, { size: 'xl', centered: true });
    } else {
      this.viewMode.set('calendar');
    }
    this.updateCalendarAppointments();
  }

  updateCalendarAppointments() {
    const appointmentsByDate: { [key: string]: Appointment[] } = {};
    this.filteredAppointments().forEach(apt => {
      const dateKey = new Date(apt.appointmentDate).toISOString().split('T')[0];
      if (!appointmentsByDate[dateKey]) {
        appointmentsByDate[dateKey] = [];
      }
      appointmentsByDate[dateKey].push(apt);
    });
    this.calendarAppointments.set(appointmentsByDate);
  }

  getAppointmentsForDate(date: Date): Appointment[] {
    const dateKey = date.toISOString().split('T')[0];
    return this.calendarAppointments()[dateKey] || [];
  }

  // Notification methods
  loadNotifications() {
    this.isLoadingNotifications.set(true);
    this.notificationService.getNotifications(1, 10).subscribe({
      next: (response) => {
        this.notifications.set(response.notifications.slice(0, 10));
        this.isLoadingNotifications.set(false);
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.isLoadingNotifications.set(false);
      }
    });
  }

  loadUnreadCount() {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => {
        this.unreadCount.set(count);
      },
      error: (error) => {
        console.error('Error loading unread count:', error);
      }
    });
  }

  toggleNotificationDropdown() {
    this.showNotificationDropdown.update(val => !val);
    if (this.showNotificationDropdown()) {
      this.loadNotifications();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-dropdown') && !target.closest('.notification-icon')) {
      this.showNotificationDropdown.set(false);
    }
  }

  markAsRead(notificationId: string) {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        this.loadNotifications();
        this.loadUnreadCount();
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.loadNotifications();
        this.loadUnreadCount();
      },
      error: (error) => {
        console.error('Error marking all as read:', error);
      }
    });
  }

  openNewAppointmentModal(content: any) {
    this.resetForm();
    this.showNewAppointmentModal.set(true);
    this.modalService.open(content, { size: 'lg', centered: true });
  }

  createAppointment() {
    const form = this.newAppointment();
    
    if (!form.patientId || !form.doctorId || !form.appointmentDate || !form.appointmentTime) {
      this.showAlert('error', 'Please fill in all required fields (Patient, Doctor, Date, Time)');
      return;
    }

    // Format date properly for backend
    const appointmentDate = new Date(form.appointmentDate).toISOString().split('T')[0];
    
    const payload: any = {
      patientId: form.patientId,
      doctorId: form.doctorId,
      appointmentDate: appointmentDate,
      appointmentTime: form.appointmentTime,
      appointmentType: this.getAppointmentTypeEnum(form.appointmentType),
      reason: form.reason || undefined,
      location: form.location || undefined,
      isVideoConsultation: form.isVideoConsultation || false,
      notes: form.notes || undefined,
      status: form.status || 'pending'
    };

    this.adminService.createAppointment(payload).subscribe({
      next: (appointment) => {
        this.showAlert('success', 'Appointment created successfully');
        this.modalService.dismissAll();
        this.resetForm();
        this.fetchAppointments(); // Refresh the list
      },
      error: (error) => {
        console.error('Error creating appointment:', error);
        this.showAlert('error', error.error?.message || 'Failed to create appointment');
      }
    });
  }

  private resetForm() {
    this.newAppointment.set({
      patientId: '',
      doctorId: '',
      appointmentDate: '',
      appointmentTime: '',
      appointmentType: 'Consultation',
      reason: '',
      location: '',
      isVideoConsultation: false,
      notes: '',
      status: 'pending' as AppointmentStatus
    });
    this.alertMessage.set(null);
  }

  private showAlert(type: 'success' | 'error', text: string) {
    this.alertMessage.set({ type, text });
    if (type === 'success') {
      setTimeout(() => this.alertMessage.set(null), 3000);
    }
  }

  getStatusClass(status: string): string {
    const baseClass = 'px-2 py-1 text-xs font-semibold rounded-full text-white';
    return baseClass;
  }

  getStatusColor(status: string): string {
    const theme = this.themeService.currentTheme();
    switch (status) {
      case 'confirmed':
        return theme?.statusConfirmed || '#10b981';
      case 'pending':
        return theme?.statusPending || '#f97316';
      case 'completed':
        return theme?.statusCompleted || '#3b82f6';
      case 'cancelled':
        return theme?.statusCancelled || '#ef4444';
      default:
        return '#6b7280';
    }
  }

  formatTime(time: string): string {
    if (!time) return '';
    // Convert 24h format to 12h format if needed
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  getPatientName(appointment: Appointment): string {
    if (appointment.patient) {
      return `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    }
    return 'Unknown Patient';
  }

  getDoctorName(appointment: Appointment): string {
    if (appointment.doctor) {
      return `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`;
    }
    return 'Unknown Doctor';
  }

  getAppointmentType(appointment: Appointment): string {
    return appointment.appointmentType || appointment.reason || 'Consultation';
  }

  getMinDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  onButtonHover(event: Event, isEnter: boolean): void {
    const target = event.target as HTMLElement;
    const theme = this.themeService.currentTheme();
    if (target) {
      target.style.backgroundColor = isEnter 
        ? (theme?.primaryHover || '#059669')
        : (theme?.primaryColor || '#10b981');
    }
  }

  clearFilters() {
    this.selectedStatus.set('all');
    this.selectedDate.set('');
    this.selectedDoctor.set('all');
    this.selectedPatient.set('all');
    this.searchQuery.set('');
    this.applyFilters();
  }

  getCalendarDays(): Array<{ date: Date; appointments: Appointment[]; hasAppointments: boolean }> {
    const days: Array<{ date: Date; appointments: Appointment[]; hasAppointments: boolean }> = [];
    const currentDate = new Date(this.calendarDate());
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Start from the first day of the week
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      const appointments = this.calendarAppointments()[dateKey] || [];
      
      days.push({
        date,
        appointments,
        hasAppointments: appointments.length > 0
      });
    }
    
    return days;
  }
}
