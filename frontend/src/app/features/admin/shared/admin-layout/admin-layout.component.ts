import { Component, OnInit, signal, HostListener } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterModule, Router } from "@angular/router"
import { FormsModule } from "@angular/forms"
import { AuthService } from "@core/services/auth.service"
import { AppointmentService } from "@core/services/appointment.service"
import { UserService } from "@core/services/user.service"

interface MenuItem {
  label: string
  icon: string
  route: string
  submenu?: SubMenuItem[]
  expanded?: boolean
}

interface SubMenuItem {
  label: string
  icon: string
  route: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  read: boolean
}

@Component({
  selector: "app-admin-layout",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./admin-layout.component.html",
  styleUrls: ["./admin-layout.component.css"],
})
export class AdminLayoutComponent implements OnInit {
  searchQuery = signal("")
  isDarkMode = signal(false)
  showNotifications = signal(false)
  showUserMenu = signal(false)
  notifications: Notification[] = []
  unreadCount = signal(0)

  menuItems: MenuItem[] = [
    { 
      label: "Dashboard", 
      icon: "bi-house", 
      route: "/admin/dashboard",
      submenu: [
        { label: "Overview", icon: "bi-speedometer2", route: "/admin/dashboard" },
        { label: "Analytics", icon: "bi-graph-up", route: "/admin/analytics" },
        { label: "Reports", icon: "bi-file-earmark-text", route: "/admin/reports" }
      ]
    },
    { 
      label: "Appointments", 
      icon: "bi-calendar-check", 
      route: "/admin/appointments",
      submenu: [
        { label: "All Appointments", icon: "bi-list-ul", route: "/admin/appointments" },
        { label: "Schedule", icon: "bi-calendar3", route: "/admin/schedule" },
        { label: "New Appointment", icon: "bi-plus-circle", route: "/admin/appointments/new" }
      ]
    },
    { 
      label: "Users", 
      icon: "bi-people", 
      route: "/admin/users",
      submenu: [
        { label: "Patients", icon: "bi-person", route: "/admin/patients" },
        { label: "Doctors", icon: "bi-person-badge", route: "/admin/doctors" },
        { label: "Admins", icon: "bi-shield-check", route: "/admin/admins" }
      ]
    },
    { 
      label: "System", 
      icon: "bi-gear", 
      route: "/admin/system",
      submenu: [
        { label: "Settings", icon: "bi-sliders", route: "/admin/settings" },
        { label: "Logs", icon: "bi-journal-text", route: "/admin/logs" },
        { label: "Backup", icon: "bi-cloud-arrow-up", route: "/admin/backup" }
      ]
    }
  ]

  quickStats = signal({
    totalAppointments: 0,
    totalPatients: 0,
    totalDoctors: 0,
    pendingAppointments: 0
  })

  currentUser = this.authService.currentUser

  constructor(
    private authService: AuthService,
    private router: Router,
    private appointmentService: AppointmentService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadQuickStats()
    this.loadNotifications()
    this.setupKeyboardShortcuts()
    
    // Load saved preferences
    this.isDarkMode.set(localStorage.getItem('admin-dark-mode') === 'true')
    if (this.isDarkMode()) {
      document.body.classList.add('dark')
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Global admin shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'k':
          event.preventDefault()
          this.focusSearch()
          break
        case 'n':
          event.preventDefault()
          this.createNewAppointment()
          break
        case 'd':
          event.preventDefault()
          this.toggleTheme()
          break
        case 'l':
          event.preventDefault()
          this.logout()
          break
      }
    }

    // Escape key to close modals
    if (event.key === 'Escape') {
      this.showNotifications.set(false)
      this.showUserMenu.set(false)
    }
  }

  setupKeyboardShortcuts() {
    console.log('Admin keyboard shortcuts:')
    console.log('- Ctrl/Cmd + K: Focus search')
    console.log('- Ctrl/Cmd + N: New appointment')
    console.log('- Ctrl/Cmd + D: Toggle theme')
    console.log('- Ctrl/Cmd + L: Logout')
    console.log('- Escape: Close modals')
  }

  focusSearch() {
    const searchInput = document.querySelector('.search-bar input') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
    }
  }

  loadQuickStats() {
    // Load dashboard statistics
    this.appointmentService.getAll().subscribe({
      next: (appointments) => {
        this.quickStats.update(stats => ({
          ...stats,
          totalAppointments: appointments.length,
          pendingAppointments: appointments.filter(a => a.status === 'pending').length
        }))
      }
    })

    // Load user statistics
    this.userService.getAll().subscribe({
      next: (users) => {
        const patients = users.filter(u => u.role === 'patient')
        const doctors = users.filter(u => u.role === 'doctor')
        
        this.quickStats.update(stats => ({
          ...stats,
          totalPatients: patients.length,
          totalDoctors: doctors.length
        }))
      }
    })
  }

  loadNotifications() {
    // Simulate notifications - in real app, this would come from API
    this.notifications = [
      {
        id: '1',
        title: 'New Appointment Request',
        message: 'Dr. Smith has a new appointment request from John Doe',
        type: 'info',
        timestamp: new Date(),
        read: false
      },
      {
        id: '2',
        title: 'System Update',
        message: 'System maintenance scheduled for tonight at 2 AM',
        type: 'warning',
        timestamp: new Date(Date.now() - 3600000),
        read: false
      },
      {
        id: '3',
        title: 'Backup Complete',
        message: 'Daily backup completed successfully',
        type: 'success',
        timestamp: new Date(Date.now() - 7200000),
        read: true
      }
    ]
    
    this.unreadCount.set(this.notifications.filter(n => !n.read).length)
  }

  markNotificationAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification && !notification.read) {
      notification.read = true
      this.unreadCount.update(count => count - 1)
    }
  }

  markAllNotificationsAsRead() {
    this.notifications.forEach(n => n.read = true)
    this.unreadCount.set(0)
  }

  toggleTheme(): void {
    this.isDarkMode.update(dark => !dark)
    localStorage.setItem('admin-dark-mode', this.isDarkMode().toString())
    document.body.classList.toggle('dark')
  }

  toggleNotifications(): void {
    this.showNotifications.update(show => !show)
    this.showUserMenu.set(false)
  }

  toggleUserMenu(): void {
    this.showUserMenu.update(show => !show)
    this.showNotifications.set(false)
  }

  createNewAppointment(): void {
    this.router.navigate(["/admin/appointments/new"])
  }

  onSearchChange(): void {
    // Implement search functionality
    console.log('Searching for:', this.searchQuery())
  }

  navigateToProfile(): void {
    this.router.navigate(['/admin/profile'])
    this.showUserMenu.set(false)
  }

  navigateToSettings(): void {
    this.router.navigate(['/admin/settings'])
    this.showUserMenu.set(false)
  }

  logout(): void {
    this.authService.logout()
  }

  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName || !lastName) return 'A'
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
  }

  getUserRole(): string {
    const user = this.currentUser()
    return user?.role || 'Admin'
  }

  toggleSubmenu(item: MenuItem): void {
    if (item.submenu) {
      item.expanded = !item.expanded
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'info':
        return 'bi-info-circle'
      case 'success':
        return 'bi-check-circle'
      case 'warning':
        return 'bi-exclamation-triangle'
      case 'error':
        return 'bi-x-circle'
      default:
        return 'bi-bell'
    }
  }
}
