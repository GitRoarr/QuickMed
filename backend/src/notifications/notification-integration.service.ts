import { Injectable } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { NotificationType, NotificationPriority, UserRole } from '../common/index';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationIntegrationService {
  constructor(private readonly notificationsService: NotificationsService) {}

  async createAppointmentNotification(
    appointment: Appointment,
    type: 'created' | 'confirmed' | 'cancelled' | 'rescheduled' | 'reminder',
    patient?: User,
    doctor?: User,
  ): Promise<void> {
    const notificationData: Partial<Notification> = {
      type: NotificationType.APPOINTMENT,
      priority: NotificationPriority.MEDIUM,
      relatedEntityId: appointment.id,
      relatedEntityType: 'appointment',
      metadata: {
        appointmentId: appointment.id,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        doctorName: doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Unknown Doctor',
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient',
      },
    };

    switch (type) {
      case 'created':
        notificationData.title = 'New Appointment Created';
        notificationData.message = `A new appointment has been created for ${appointment.appointmentDate} at ${appointment.appointmentTime}`;
        notificationData.priority = NotificationPriority.MEDIUM;
        break;
      case 'confirmed':
        notificationData.title = 'Appointment Confirmed';
        notificationData.message = `Your appointment with Dr. ${doctor?.firstName} ${doctor?.lastName} has been confirmed for ${appointment.appointmentDate} at ${appointment.appointmentTime}`;
        notificationData.priority = NotificationPriority.MEDIUM;
        break;
      case 'cancelled':
        notificationData.title = 'Appointment Cancelled';
        notificationData.message = `Your appointment scheduled for ${appointment.appointmentDate} at ${appointment.appointmentTime} has been cancelled`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
      case 'rescheduled':
        notificationData.title = 'Appointment Rescheduled';
        notificationData.message = `Your appointment has been rescheduled to ${appointment.appointmentDate} at ${appointment.appointmentTime}`;
        notificationData.priority = NotificationPriority.MEDIUM;
        break;
      case 'reminder':
        notificationData.title = 'Appointment Reminder';
        notificationData.message = `You have an appointment with Dr. ${doctor?.firstName} ${doctor?.lastName} tomorrow at ${appointment.appointmentTime}`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
    }

    if (patient) {
      await this.notificationsService.sendToUser(patient.id, notificationData as Notification);
    }

    if (doctor) {
      await this.notificationsService.sendToUser(doctor.id, {
        ...notificationData,
        title: `Patient Appointment - ${notificationData.title}`,
        message: `Patient ${patient?.firstName} ${patient?.lastName} - ${notificationData.message}`,
      } as Notification);
    }
  }

  async createPrescriptionNotification(
    prescriptionId: string,
    patientId: string,
    type: 'ready' | 'refill' | 'expired',
    medicationName?: string,
  ): Promise<void> {
    const notificationData: Partial<Notification> = {
      type: NotificationType.PRESCRIPTION,
      priority: NotificationPriority.MEDIUM,
      relatedEntityId: prescriptionId,
      relatedEntityType: 'prescription',
      metadata: {
        prescriptionId,
        medicationName,
      },
    };

    switch (type) {
      case 'ready':
        notificationData.title = 'Prescription Ready';
        notificationData.message = `Your prescription for ${medicationName || 'medication'} is ready for pickup`;
        notificationData.priority = NotificationPriority.MEDIUM;
        break;
      case 'refill':
        notificationData.title = 'Prescription Refill Needed';
        notificationData.message = `Your prescription for ${medicationName || 'medication'} needs to be refilled`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
      case 'expired':
        notificationData.title = 'Prescription Expired';
        notificationData.message = `Your prescription for ${medicationName || 'medication'} has expired`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
    }

    await this.notificationsService.sendToUser(patientId, notificationData as Notification);
  }

  async createTestResultNotification(
    testResultId: string,
    patientId: string,
    type: 'available' | 'abnormal' | 'normal',
    testName?: string,
  ): Promise<void> {
    const notificationData: Partial<Notification> = {
      type: NotificationType.TEST_RESULT,
      priority: NotificationPriority.HIGH,
      relatedEntityId: testResultId,
      relatedEntityType: 'test_result',
      metadata: {
        testResultId,
        testName,
      },
    };

    switch (type) {
      case 'available':
        notificationData.title = 'Test Results Available';
        notificationData.message = `Your ${testName || 'test'} results are now available`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
      case 'abnormal':
        notificationData.title = 'Abnormal Test Results';
        notificationData.message = `Your ${testName || 'test'} results require immediate attention. Please contact your doctor.`;
        notificationData.priority = NotificationPriority.URGENT;
        break;
      case 'normal':
        notificationData.title = 'Test Results Normal';
        notificationData.message = `Your ${testName || 'test'} results are within normal range`;
        notificationData.priority = NotificationPriority.MEDIUM;
        break;
    }

    await this.notificationsService.sendToUser(patientId, notificationData as Notification);
  }

  async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<void> {
    await this.notificationsService.sendToUser(userId, {
      type: NotificationType.SYSTEM,
      priority: priority as NotificationPriority,
      title,
      message,
      userId,
    } as Notification);
  }

  async createBulkSystemNotification(
    userIds: string[],
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<void> {
    await this.notificationsService.sendToUsers(userIds, {
      type: NotificationType.SYSTEM,
      priority: priority as NotificationPriority,
      title,
      message,
    } as Notification);
  }

  async createRoleBasedNotification(
    role: UserRole,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<void> {
    await this.notificationsService.sendToRole(role, {
      type: NotificationType.SYSTEM,
      priority: priority as NotificationPriority,
      title,
      message,
    } as Notification);
  }

  async sendAppointmentReminders(): Promise<void> {
    const tomorrow = new Date('2025-10-28T00:11:00Z'); // 12:11 AM EAT, October 28, 2025
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const appointments = await this.notificationsService.getTomorrowAppointments(tomorrow);
    for (const appointment of appointments) {
      await this.createAppointmentNotification(appointment, 'reminder', appointment.patient, appointment.doctor);
    }
  }

  async cleanupExpiredNotifications(): Promise<void> {
    await this.notificationsService.cleanupExpiredNotifications();
  }

  async getNotificationAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    return await this.notificationsService.getAnalytics(startDate, endDate);
  }
}
