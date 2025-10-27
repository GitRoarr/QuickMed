import { Component, OnInit, OnDestroy, signal, HostListener } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule, ReactiveFormsModule } from "@angular/forms"
import { Router } from "@angular/router"
import { NotificationService } from "@core/services/notification.service"
import { Notification, NotificationStats } from "@core/models/notification.model"

@Component({
  selector: "app-notification-center",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: "./notification-center.component.html",
  styleUrls: ["./notification-center.component.css"],
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  isOpen = signal(false)
  notifications = signal<Notification[]>([])
  unreadCount = signal(0)
  isLoading = signal(false)
  stats = signal<NotificationStats | null>(null)
  selectedFilter = signal("all")
  selectedPriority = signal("all")
  currentPage = signal(1)
  totalPages = signal(1)
  hasMore = signal(true)

  filterOptions = [
    { value: "all", label: "All Notifications", icon: "bi-list" },
    { value: "info", label: "Info", icon: "bi-info-circle" },
    { value: "success", label: "Success", icon: "bi-check-circle" },
    { value: "warning", label: "Warning", icon: "bi-exclamation-triangle" },
    { value: "error", label: "Error", icon: "bi-x-circle" },
    { value: "appointment", label: "Appointments", icon: "bi-calendar-check" },
    { value: "prescription", label: "Prescriptions", icon: "bi-prescription" },
    { value: "test_result", label: "Test Results", icon: "bi-clipboard-data" },
    { value: "system", label: "System", icon: "bi-gear" },
  ]

  priorityOptions = [
    { value: "all", label: "All Priorities", icon: "bi-list" },
    { value: "low", label: "Low", icon: "bi-circle" },
    { value: "medium", label: "Medium", icon: "bi-circle-fill" },
    { value: "high", label: "High", icon: "bi-exclamation-circle" },
    { value: "urgent", label: "Urgent", icon: "bi-exclamation-triangle-fill" },
  ]

  constructor(
    private notificationService: NotificationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadNotifications()
    this.loadStats()
  }

  ngOnDestroy(): void {}

  @HostListener("document:keydown", ["$event"])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === "Escape" && this.isOpen()) {
      this.closeNotificationCenter()
    }
  }

  toggleNotificationCenter(): void {
    this.isOpen.update((open) => !open)
    if (this.isOpen()) {
      this.loadNotifications()
    }
  }

  closeNotificationCenter(): void {
    this.isOpen.set(false)
  }

  async loadNotifications(): Promise<void> {
    try {
      this.isLoading.set(true)
      const response = await this.notificationService
        .getNotifications(
          this.currentPage(),
          20,
          this.selectedFilter() !== "all" ? this.selectedFilter() : undefined,
          this.selectedPriority() !== "all" ? this.selectedPriority() : undefined,
        )
        .toPromise()

      if (response) {
        this.notifications.set(response.notifications)
        this.unreadCount.set(response.notifications.filter((n) => !n.read).length)
        this.totalPages.set(Math.ceil(response.total / 20))
        this.hasMore.set(this.currentPage() < this.totalPages())
      }
    } catch (error) {
      console.error("Error loading notifications:", error)
    } finally {
      this.isLoading.set(false)
    }
  }

  async loadStats(): Promise<void> {
    try {
      const stats = await this.notificationService.getNotificationStats().toPromise()
      if (stats) {
        this.stats.set(stats)
      }
    } catch (error) {
      console.error("Error loading notification stats:", error)
    }
  }

  async loadMoreNotifications(): Promise<void> {
    if (!this.hasMore() || this.isLoading()) return

    try {
      this.isLoading.set(true)
      this.currentPage.update((page) => page + 1)

      const response = await this.notificationService
        .getNotifications(
          this.currentPage(),
          20,
          this.selectedFilter() !== "all" ? this.selectedFilter() : undefined,
          this.selectedPriority() !== "all" ? this.selectedPriority() : undefined,
        )
        .toPromise()

      if (response) {
        const currentNotifications = this.notifications()
        this.notifications.set([...currentNotifications, ...response.notifications])
        this.hasMore.set(this.currentPage() < this.totalPages())
      }
    } catch (error) {
      console.error("Error loading more notifications:", error)
    } finally {
      this.isLoading.set(false)
    }
  }

  async markAsRead(notification: Notification): Promise<void> {
    if (notification.read) return

    try {
      await this.notificationService.markAsRead(notification.id).toPromise()
      const notifications = this.notifications()
      const index = notifications.findIndex((n) => n.id === notification.id)
      if (index !== -1) {
        notifications[index].read = true
        this.notifications.set([...notifications])
        this.unreadCount.update((count) => Math.max(0, count - 1))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await this.notificationService.markAllAsRead().toPromise()
      const notifications = this.notifications().map((n) => ({ ...n, read: true }))
      this.notifications.set(notifications)
      this.unreadCount.set(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  async deleteNotification(notification: Notification): Promise<void> {
    try {
      await this.notificationService.deleteNotification(notification.id).toPromise()
      const notifications = this.notifications().filter((n) => n.id !== notification.id)
      this.notifications.set(notifications)
      if (!notification.read) {
        this.unreadCount.update((count) => Math.max(0, count - 1))
      }
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  async deleteAllNotifications(): Promise<void> {
    try {
      await this.notificationService.deleteAllNotifications().toPromise()
      this.notifications.set([])
      this.unreadCount.set(0)
    } catch (error) {
      console.error("Error deleting all notifications:", error)
    }
  }

  onFilterChange(): void {
    this.currentPage.set(1)
    this.loadNotifications()
  }

  onPriorityChange(): void {
    this.currentPage.set(1)
    this.loadNotifications()
  }

  handleNotificationClick(notification: Notification): void {
    this.markAsRead(notification)

    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl])
      this.closeNotificationCenter()
    }
  }

  getNotificationIcon(type: string): string {
    return this.notificationService.getNotificationIcon(type)
  }

  getNotificationColorClass(type: string): string {
    return this.notificationService.getNotificationColorClass(type)
  }

  getPriorityColorClass(priority: string): string {
    return this.notificationService.getPriorityColorClass(priority)
  }

  formatNotificationTime(date: Date | string): string {
    return this.notificationService.formatNotificationTime(date)
  }

  getFilteredNotifications(): Notification[] {
    return this.notifications()
  }

  getUnreadNotifications(): Notification[] {
    return this.notifications().filter((n) => !n.read)
  }

  getNotificationsByType(type: string): Notification[] {
    return this.notifications().filter((n) => n.type === type)
  }

  getNotificationsByPriority(priority: string): Notification[] {
    return this.notifications().filter((n) => n.priority === priority)
  }

  hasUnreadNotifications(): boolean {
    return this.unreadCount() > 0
  }

  getNotificationCount(): number {
    return this.notifications().length
  }

  getUnreadCount(): number {
    return this.unreadCount()
  }

  getStatsByType(type: string): number {
    const stats = this.stats()
    if (!stats) return 0
    return stats.byType[type as keyof typeof stats.byType] || 0
  }

  getStatsByPriority(priority: string): number {
    const stats = this.stats()
    if (!stats) return 0
    return stats.byPriority[priority as keyof typeof stats.byPriority] || 0
  }

  getTotalNotifications(): number {
    const stats = this.stats()
    return stats?.total || 0
  }

  getUnreadPercentage(): number {
    const stats = this.stats()
    if (!stats || stats.total === 0) return 0
    return Math.round((stats.unread / stats.total) * 100)
  }
}