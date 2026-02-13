import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DoctorHeaderComponent } from '../shared/doctor-header/doctor-header.component';
import { NotificationService } from '@core/services/notification.service';
import { Notification } from '@core/models/notification.model';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/services/auth.service';

@Component({
    selector: 'app-doctor-notifications',
    standalone: true,
    imports: [CommonModule, RouterModule, DoctorHeaderComponent, DatePipe],
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {
    private notificationService = inject(NotificationService);
    private toast = inject(ToastService);
    private auth = inject(AuthService);

    notifications = signal<Notification[]>([]);
    isLoading = signal(true);
    currentUser = signal<any>(null);
    unreadCount = signal(0);

    currentPage = signal(1);
    pageSize = 20;
    hasMore = signal(true);

    ngOnInit(): void {
        this.currentUser.set(this.auth.currentUser());
        this.loadNotifications();
        this.loadUnreadCount();
    }

    loadUnreadCount() {
        this.notificationService.getUnreadCount().subscribe(c => this.unreadCount.set(c || 0));
    }

    loadNotifications(page: number = 1, append: boolean = false) {
        this.isLoading.set(true);
        this.notificationService.getNotifications(page, this.pageSize).subscribe({
            next: (res) => {
                if (append) {
                    this.notifications.update(current => [...current, ...res.notifications]);
                } else {
                    this.notifications.set(res.notifications);
                }

                this.hasMore.set(res.notifications.length === this.pageSize); // Simple check
                this.isLoading.set(false);
                this.currentPage.set(page);
            },
            error: () => {
                this.isLoading.set(false);
                this.toast.error('Failed to load notifications');
            }
        });
    }

    loadMore() {
        if (!this.hasMore() || this.isLoading()) return;
        this.loadNotifications(this.currentPage() + 1, true);
    }

    markAsRead(notification: Notification) {
        if (notification.read) return;
        this.notificationService.markAsRead(notification.id).subscribe({
            next: () => {
                this.notifications.update(list =>
                    list.map(n => n.id === notification.id ? { ...n, read: true } : n)
                );
                this.unreadCount.update(c => Math.max(0, c - 1));
            },
            error: () => this.toast.error('Failed to update notification')
        });
    }

    markAllAsRead() {
        this.notificationService.markAllAsRead().subscribe({
            next: () => {
                this.notifications.update(list => list.map(n => ({ ...n, read: true })));
                this.unreadCount.set(0);
                this.toast.success('All notifications marked as read');
            },
            error: () => this.toast.error('Failed to mark all as read')
        });
    }

    deleteNotification(id: string) {
        if (!confirm('Are you sure you want to delete this notification?')) return;
        this.notificationService.deleteNotification(id).subscribe({
            next: () => {
                this.notifications.update(list => list.filter(n => n.id !== id));
                this.toast.success('Notification removed');
            },
            error: () => this.toast.error('Failed to delete notification')
        });
    }

    getDoctorInitials(): string {
        const u = this.currentUser();
        return u ? (u.firstName[0] + u.lastName[0]).toUpperCase() : 'DR';
    }

    getNotificationIcon(type: string): string {
        const icons: Record<string, string> = {
            appointment: 'bi-calendar-event',
            message: 'bi-chat-dots',
            test_result: 'bi-clipboard2-pulse',
            lab: 'bi-clipboard2-pulse',
            prescription: 'bi-capsule',
            reminder: 'bi-alarm',
            error: 'bi-exclamation-triangle-fill',
            warning: 'bi-exclamation-triangle',
            info: 'bi-info-circle',
            system: 'bi-gear',
        };
        return icons[type] || 'bi-bell';
    }

    getNotificationColor(type: string): string {
        const colors: Record<string, string> = {
            appointment: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
            message: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20',
            test_result: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20',
            lab: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20',
            prescription: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20',
            reminder: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/20',
            error: 'text-red-600 bg-red-100 dark:bg-red-900/20',
            warning: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20',
            info: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
            system: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
        };
        return colors[type] || 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    }
}
