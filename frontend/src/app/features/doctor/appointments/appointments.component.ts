import { Component, OnInit, signal, inject } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { AppointmentService } from "@core/services/appointment.service";
import { Appointment, AppointmentStatus } from "@core/models/appointment.model";
import { AuthService } from "@core/services/auth.service";

interface AppointmentFilter {
  status: string;
  dateRange: string;
  patient: string;
}

@Component({
  selector: "app-doctor-appointments",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: "./appointments.component.html",
  styleUrls: ["./appointments.component.css"],
})
export class AppointmentsComponent implements OnInit {
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  isLoading = signal(true);
  searchQuery = signal("");
  selectedFilter = signal("all");
  showFilters = signal(false);
  sortBy = signal("date");
  sortOrder = signal("desc");
  selectedDate = signal(new Date().toISOString().split("T")[0]);
  viewMode = signal("grid");

  AppointmentStatus = AppointmentStatus;

  appointmentsBySlot: { [key: string]: Appointment[] } = {};

  private authService = inject(AuthService);
  private router = inject(Router);
  private badgeService = inject(BadgeService);
  private messageService = inject(MessageService);
  currentUser = signal<any>(null);

  menuItems = signal([
    { label: "Dashboard", icon: "bi-house-door", route: "/doctor/dashboard" },
    { label: "Appointments", icon: "bi-calendar-check", route: "/doctor/appointments" },
    { label: "Schedule", icon: "bi-calendar3", route: "/doctor/schedule" },
    { label: "My Patients", icon: "bi-people", route: "/doctor/patients" },
    { label: "Medical Records", icon: "bi-file-earmark-medical", route: "/doctor/records" },
    { label: "Prescriptions", icon: "bi-prescription2", route: "/doctor/prescriptions" },
    { label: "Messages", icon: "bi-chat-dots", route: "/doctor/messages" },
    { label: "Analytics", icon: "bi-graph-up", route: "/doctor/analytics" },
    { label: "Settings", icon: "bi-gear", route: "/doctor/settings" },
  ]);

  filterOptions = [
    { value: "all", label: "All Appointments", icon: "bi-list" },
    { value: "pending", label: "Pending", icon: "bi-clock" },
    { value: "confirmed", label: "Confirmed", icon: "bi-check-circle" },
    { value: "completed", label: "Completed", icon: "bi-check2-all" },
    { value: "cancelled", label: "Cancelled", icon: "bi-x-circle" },
  ];

  sortOptions = [
    { value: "date", label: "Date" },
    { value: "patient", label: "Patient" },
    { value: "status", label: "Status" },
    { value: "time", label: "Time" },
  ];

  timeSlots = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
  ];

  constructor(private appointmentService: AppointmentService) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadAppointments();
    this.loadBadgeCounts();
  }

  loadBadgeCounts(): void {
    this.appointmentService.getPendingCount().subscribe({
      next: (data) => {
        this.updateMenuItems(data.count || 0, this.badgeService.messageCount());
      }
    });

    this.messageService.getUnreadCount().subscribe({
      next: (data) => {
        this.updateMenuItems(this.badgeService.appointmentCount(), data.count || 0);
      }
    });
  }

  updateMenuItems(appointmentCount: number, messageCount: number): void {
    this.menuItems.set([
      { label: "Dashboard", icon: "bi-house-door", route: "/doctor/dashboard" },
      { label: "Appointments", icon: "bi-calendar-check", route: "/doctor/appointments", badge: appointmentCount > 0 ? appointmentCount : undefined },
      { label: "Schedule", icon: "bi-calendar3", route: "/doctor/schedule" },
      { label: "My Patients", icon: "bi-people", route: "/doctor/patients" },
      { label: "Medical Records", icon: "bi-file-earmark-medical", route: "/doctor/records" },
      { label: "Prescriptions", icon: "bi-prescription2", route: "/doctor/prescriptions" },
      { label: "Messages", icon: "bi-chat-dots", route: "/doctor/messages", badge: messageCount > 0 ? messageCount : undefined },
      { label: "Analytics", icon: "bi-graph-up", route: "/doctor/analytics" },
      { label: "Settings", icon: "bi-gear", route: "/doctor/settings" },
    ]);
  }

  loadUserData(): void {
    const user = this.authService.currentUser();
    this.currentUser.set(user);
  }

  getDoctorName(): string {
    const user = this.currentUser();
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Doctor';
  }

  getDoctorSpecialty(): string {
    const user = this.currentUser();
    return user?.specialty || 'General Practitioner';
  }

  getDoctorInitials(): string {
    const name = this.getDoctorName();
    if (!name) return 'DR';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  loadAppointments(): void {
    this.isLoading.set(true);
    this.appointmentService.getMyAppointments().subscribe({
      next: (data) => {
        this.appointments = data;
        this.filteredAppointments = [...data];
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  applyFilters(): void {
    let filtered = [...this.appointments];

    // Search filter
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter((appointment) =>
        appointment.patient?.firstName?.toLowerCase().includes(query) ||
        appointment.patient?.lastName?.toLowerCase().includes(query) ||
        appointment.notes?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (this.selectedFilter() !== "all") {
      filtered = filtered.filter((appointment) => appointment.status === this.selectedFilter());
    }

    // Date filter
    if (this.selectedDate()) {
      filtered = filtered.filter((appointment) => appointment.appointmentDate === this.selectedDate());
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy()) {
        case "date":
          comparison = new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime();
          break;
        case "patient":
          const patientA = `${a.patient?.firstName} ${a.patient?.lastName}`.toLowerCase();
          const patientB = `${b.patient?.firstName} ${b.patient?.lastName}`.toLowerCase();
          comparison = patientA.localeCompare(patientB);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "time":
          comparison = a.appointmentTime.localeCompare(b.appointmentTime);
          break;
      }

      return this.sortOrder() === "desc" ? -comparison : comparison;
    });

    this.filteredAppointments = filtered;

    // Update appointmentsBySlot mapping after filtering
    this.updateAppointmentsBySlot();
  }

  // Updated helper function to ensure all timeSlots have entries
  updateAppointmentsBySlot(): void {
    const map: { [key: string]: Appointment[] } = {};
    // Initialize all timeSlots with empty arrays
    this.timeSlots.forEach((slot) => {
      map[slot] = [];
    });
    // Populate with appointments
    this.filteredAppointments.forEach((appointment) => {
      const slot = appointment.appointmentTime;
      if (map[slot]) {
        map[slot].push(appointment);
      }
    });
    this.appointmentsBySlot = map;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  onDateChange(): void {
    this.applyFilters();
  }

  toggleSortOrder(): void {
    this.sortOrder.update((order) => (order === "asc" ? "desc" : "asc"));
    this.applyFilters();
  }

  toggleFilters(): void {
    this.showFilters.update((show) => !show);
  }

  toggleViewMode(): void {
    this.viewMode.update((mode) => (mode === "grid" ? "calendar" : "grid"));
  }

  updateStatus(id: string, status: AppointmentStatus): void {
    this.appointmentService.update(id, { status }).subscribe({
      next: () => {
        this.loadAppointments();
        this.showSuccessNotification(`Appointment ${status.toLowerCase()} successfully`);
      },
      error: () => {
        this.showErrorNotification("Failed to update appointment status");
      },
    });
  }

  addNotes(appointment: Appointment): void {
    const notes = prompt("Add notes for this appointment:", appointment.notes || "");
    if (notes !== null) {
      this.appointmentService.update(appointment.id, { notes }).subscribe({
        next: () => {
          this.loadAppointments();
          this.showSuccessNotification("Notes updated successfully");
        },
        error: () => {
          this.showErrorNotification("Failed to update notes");
        },
      });
    }
  }

  viewPatientDetails(appointment: Appointment): void {
    this.router.navigate(["/doctor/patients", appointment.patient?.id]);
  }

  rescheduleAppointment(appointment: Appointment): void {
    this.router.navigate(["/doctor/appointments/reschedule", appointment.id]);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return "status-badge confirmed";
      case AppointmentStatus.PENDING:
        return "status-badge pending";
      case AppointmentStatus.CANCELLED:
        return "status-badge cancelled";
      case AppointmentStatus.COMPLETED:
        return "status-badge completed";
      default:
        return "status-badge default";
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return "bi-check-circle";
      case AppointmentStatus.PENDING:
        return "bi-clock";
      case AppointmentStatus.CANCELLED:
        return "bi-x-circle";
      case AppointmentStatus.COMPLETED:
        return "bi-check2-all";
      default:
        return "bi-question-circle";
    }
  }

  getTodaysAppointments(): Appointment[] {
    const today = new Date().toISOString().split("T")[0];
    return this.filteredAppointments
      .filter((appointment) => appointment.appointmentDate === today)
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
  }

  getUpcomingAppointments(): Appointment[] {
    const today = new Date();
    return this.filteredAppointments
      .filter(
        (appointment) =>
          new Date(appointment.appointmentDate) >= today &&
          appointment.status !== "cancelled" &&
          appointment.status !== "completed"
      )
      .slice(0, 5);
  }

  getAppointmentStats() {
    const total = this.appointments.length;
    const pending = this.appointments.filter((a) => a.status === "pending").length;
    const confirmed = this.appointments.filter((a) => a.status === "confirmed").length;
    const completed = this.appointments.filter((a) => a.status === "completed").length;
    const cancelled = this.appointments.filter((a) => a.status === "cancelled").length;

    return { total, pending, confirmed, completed, cancelled };
  }

  getAppointmentsByTimeSlot(): { [key: string]: Appointment[] } {
    return this.appointmentsBySlot;
  }

  showSuccessNotification(message: string): void {
    console.log("Success:", message);
  }

  showErrorNotification(message: string): void {
    console.log("Error:", message);
  }
}