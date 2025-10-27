import { Injectable } from "@angular/core"
import {  HttpClient, HttpParams } from "@angular/common/http"
import {  Observable, BehaviorSubject, interval } from "rxjs"
import { map, tap } from "rxjs/operators"
import { environment } from "@environments/environment"

import {
  Notification,
  NotificationPreferences,
  NotificationTemplate,
  NotificationStats,
} from "../models/notification.model"


@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private apiUrl = environment.apiUrl
  private notificationsSubject = new BehaviorSubject<Notification[]>([])
  private unreadCountSubject = new BehaviorSubject<number>(0)
  private refreshInterval = interval(30000)

  public notifications$ = this.notificationsSubject.asObservable()
  public unreadCount$ = this.unreadCountSubject.asObservable()

  constructor(private http: HttpClient) {
    this.startAutoRefresh()
  }

  // Get all notifications for current user
  getNotifications(
    page = 1,
    limit = 20,
    type?: string,
    priority?: string,
  ): Observable<{ notifications: Notification[]; total: number }> {
    let params = new HttpParams().set("page", page.toString()).set("limit", limit.toString())

    if (type) {
      params = params.set("type", type)
    }
    if (priority) {
      params = params.set("priority", priority)
    }

    return this.http.get<{ notifications: Notification[]; total: number }>(this.apiUrl, { params }).pipe(
      tap((response) => {
        this.notificationsSubject.next(response.notifications)
        this.updateUnreadCount()
      }),
    )
  }

  // Get notification by ID
  getNotificationById(id: string): Observable<Notification> {
    return this.http.get<Notification>(`${this.apiUrl}/${id}`)
  }

  // Mark notification as read
  markAsRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        const notifications = this.notificationsSubject.value
        const index = notifications.findIndex((n) => n.id === id)
        if (index !== -1) {
          notifications[index].read = true
          this.notificationsSubject.next([...notifications])
          this.updateUnreadCount()
        }
      }),
    )
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        const notifications = this.notificationsSubject.value.map((n) => ({ ...n, read: true }))
        this.notificationsSubject.next(notifications)
        this.updateUnreadCount()
      }),
    )
  }

  // Delete notification
  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const notifications = this.notificationsSubject.value.filter((n) => n.id !== id)
        this.notificationsSubject.next(notifications)
        this.updateUnreadCount()
      }),
    )
  }

  // Delete all notifications
  deleteAllNotifications(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete-all`).pipe(
      tap(() => {
        this.notificationsSubject.next([])
        this.updateUnreadCount()
      }),
    )
  }

  getNotificationStats(): Observable<NotificationStats> {
    return this.http.get<NotificationStats>(`${this.apiUrl}/stats`)
  }

  getNotificationPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.apiUrl}/preferences`)
  }

  updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Observable<NotificationPreferences> {
    return this.http.put<NotificationPreferences>(`${this.apiUrl}/preferences`, preferences)
  }

  createNotification(notification: Partial<Notification>): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification)
  }

  sendNotificationToUser(userId: string, notification: Partial<Notification>): Observable<Notification> {
    return this.http.post<Notification>(`${this.apiUrl}/send`, {
      userId,
      ...notification,
    })
  }

  sendNotificationToUsers(userIds: string[], notification: Partial<Notification>): Observable<Notification[]> {
    return this.http.post<Notification[]>(`${this.apiUrl}/send-bulk`, {
      userIds,
      ...notification,
    })
  }

  sendNotificationToRole(role: string, notification: Partial<Notification>): Observable<Notification[]> {
    return this.http.post<Notification[]>(`${this.apiUrl}/send-role`, {
      role,
      ...notification,
    })
  }

  getNotificationTemplates(): Observable<NotificationTemplate[]> {
    return this.http.get<NotificationTemplate[]>(`${this.apiUrl}/templates`)
  }

  createNotificationTemplate(template: Partial<NotificationTemplate>): Observable<NotificationTemplate> {
    return this.http.post<NotificationTemplate>(`${this.apiUrl}/templates`, template)
  }

  updateNotificationTemplate(id: string, template: Partial<NotificationTemplate>): Observable<NotificationTemplate> {
    return this.http.put<NotificationTemplate>(`${this.apiUrl}/templates/${id}`, template)
  }

  // Delete notification template
  deleteNotificationTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/templates/${id}`)
  }

  // Get notification history
  getNotificationHistory(userId?: string, startDate?: Date, endDate?: Date): Observable<Notification[]> {
    let params = new HttpParams()
    if (userId) {
      params = params.set("userId", userId)
    }
    if (startDate) {
      params = params.set("startDate", startDate.toISOString())
    }
    if (endDate) {
      params = params.set("endDate", endDate.toISOString())
    }

    return this.http.get<Notification[]>(`${this.apiUrl}/history`, { params })
  }

  // Get unread count
  getUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).pipe(map((response) => response.count))
  }

  // Refresh notifications
  refreshNotifications(): Observable<Notification[]> {
    return this.getNotifications().pipe(map((response) => response.notifications))
  }

  // Auto-refresh notifications
  private startAutoRefresh(): void {
    this.refreshInterval.subscribe(() => {
      this.refreshNotifications().subscribe()
    })
  }

  // Update unread count
  private updateUnreadCount(): void {
    const unreadCount = this.notificationsSubject.value.filter((n) => !n.read).length
    this.unreadCountSubject.next(unreadCount)
  }

  // Get notification icon
  getNotificationIcon(type: string): string {
    switch (type) {
      case "info":
        return "bi-info-circle-fill"
      case "success":
        return "bi-check-circle-fill"
      case "warning":
        return "bi-exclamation-triangle-fill"
      case "error":
        return "bi-x-circle-fill"
      case "appointment":
        return "bi-calendar-check"
      case "prescription":
        return "bi-prescription"
      case "test_result":
        return "bi-clipboard-data"
      case "system":
        return "bi-gear"
      default:
        return "bi-bell"
    }
  }

  // Get notification color class
  getNotificationColorClass(type: string): string {
    switch (type) {
      case "info":
        return "notification-info"
      case "success":
        return "notification-success"
      case "warning":
        return "notification-warning"
      case "error":
        return "notification-error"
      case "appointment":
        return "notification-appointment"
      case "prescription":
        return "notification-prescription"
      case "test_result":
        return "notification-test-result"
      case "system":
        return "notification-system"
      default:
        return "notification-default"
    }
  }

  // Get priority color class
  getPriorityColorClass(priority: string): string {
    switch (priority) {
      case "low":
        return "priority-low"
      case "medium":
        return "priority-medium"
      case "high":
        return "priority-high"
      case "urgent":
        return "priority-urgent"
      default:
        return "priority-default"
    }
  }

  // Format notification time
  formatNotificationTime(date: Date | string): string {
    const now = new Date()
    const notificationDate = new Date(date)
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) {
      return "Just now"
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours} hour${hours > 1 ? "s" : ""} ago`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `${days} day${days > 1 ? "s" : ""} ago`
    }
  }

  // Create appointment notification
  createAppointmentNotification(
    appointmentId: string,
    type: "reminder" | "confirmation" | "cancellation" | "reschedule",
  ): Observable<Notification> {
    const notification: Partial<Notification> = {
      type: "appointment",
      priority: "medium",
      relatedEntityId: appointmentId,
      relatedEntityType: "appointment",
      metadata: { appointmentId },
    }

    switch (type) {
      case "reminder":
        notification.title = "Appointment Reminder"
        notification.message = "You have an upcoming appointment"
        notification.priority = "high"
        break
      case "confirmation":
        notification.title = "Appointment Confirmed"
        notification.message = "Your appointment has been confirmed"
        notification.priority = "medium"
        break
      case "cancellation":
        notification.title = "Appointment Cancelled"
        notification.message = "Your appointment has been cancelled"
        notification.priority = "high"
        break
      case "reschedule":
        notification.title = "Appointment Rescheduled"
        notification.message = "Your appointment has been rescheduled"
        notification.priority = "medium"
        break
    }

    return this.createNotification(notification)
  }

  // Create prescription notification
  createPrescriptionNotification(
    prescriptionId: string,
    type: "ready" | "refill" | "expired",
  ): Observable<Notification> {
    const notification: Partial<Notification> = {
      type: "prescription",
      priority: "medium",
      relatedEntityId: prescriptionId,
      relatedEntityType: "prescription",
      metadata: { prescriptionId },
    }

    switch (type) {
      case "ready":
        notification.title = "Prescription Ready"
        notification.message = "Your prescription is ready for pickup"
        notification.priority = "medium"
        break
      case "refill":
        notification.title = "Prescription Refill"
        notification.message = "Your prescription needs to be refilled"
        notification.priority = "high"
        break
      case "expired":
        notification.title = "Prescription Expired"
        notification.message = "Your prescription has expired"
        notification.priority = "high"
        break
    }

    return this.createNotification(notification)
  }

  // Create test result notification
  createTestResultNotification(
    testResultId: string,
    type: "available" | "abnormal" | "normal",
  ): Observable<Notification> {
    const notification: Partial<Notification> = {
      type: "test_result",
      priority: "high",
      relatedEntityId: testResultId,
      relatedEntityType: "test_result",
      metadata: { testResultId },
    }

    switch (type) {
      case "available":
        notification.title = "Test Results Available"
        notification.message = "Your test results are now available"
        notification.priority = "high"
        break
      case "abnormal":
        notification.title = "Abnormal Test Results"
        notification.message = "Your test results require attention"
        notification.priority = "urgent"
        break
      case "normal":
        notification.title = "Test Results Normal"
        notification.message = "Your test results are within normal range"
        notification.priority = "medium"
        break
    }

    return this.createNotification(notification)
  }

  // Create system notification
  createSystemNotification(
    title: string,
    message: string,
    priority: "low" | "medium" | "high" | "urgent" = "medium",
  ): Observable<Notification> {
    return this.createNotification({
      type: "system",
      priority,
      title,
      message,
    })
  }
}
