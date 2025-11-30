import { Injectable, signal } from '@angular/core';
import { AppointmentService } from './appointment.service';
import { MessageService } from './message.service';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class BadgeService {
  appointmentCount = signal(0);
  messageCount = signal(0);

  constructor(
    private appointmentService: AppointmentService,
    private messageService: MessageService,
  ) {}

  loadBadgeCounts(): Observable<{ appointments: number; messages: number }> {
    return forkJoin({
      appointments: this.appointmentService.getPendingCount().pipe(
        map(res => res.count || 0),
        catchError(() => of(0))
      ),
      messages: this.messageService.getUnreadCount().pipe(
        map(res => res.count || 0),
        catchError(() => of(0))
      ),
    }).pipe(
      map(counts => {
        this.appointmentCount.set(counts.appointments);
        this.messageCount.set(counts.messages);
        return counts;
      })
    );
  }

  getMenuItems(baseItems: Array<{ label: string; icon: string; route: string; badge?: number }>) {
    return baseItems.map(item => {
      if (item.label === 'Appointments') {
        return { ...item, badge: this.appointmentCount() > 0 ? this.appointmentCount() : undefined };
      }
      if (item.label === 'Messages') {
        return { ...item, badge: this.messageCount() > 0 ? this.messageCount() : undefined };
      }
      return item;
    });
  }
}
