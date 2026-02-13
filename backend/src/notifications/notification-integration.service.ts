import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { NotificationType, NotificationPriority, UserRole, AppointmentType } from '../common/index';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationIntegrationService {
  private notificationsGateway: NotificationsGateway | null = null;

  constructor(
    private readonly notificationsService: NotificationsService,
  ) { }

  setGateway(gateway: NotificationsGateway): void {
    this.notificationsGateway = gateway;
  }

  private async emitNotification(userId: string, notification: Notification): Promise<void> {
    if (this.notificationsGateway) {
      await this.notificationsGateway.sendNotification(userId, notification);
    }
  }

  async createAppointmentNotification(
    appointment: Appointment,
    type: 'created' | 'confirmed' | 'cancelled' | 'rescheduled' | 'reminder_24h' | 'reminder_1h' | 'overdue' | 'missed',
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
        reminderOffsetMinutes: type === 'reminder_24h' ? 1440 : type === 'reminder_1h' ? 60 : undefined,
        channel: appointment.isVideoConsultation || appointment.appointmentType === AppointmentType.VIDEO_CALL ? 'video' : 'in_person',
        chatEnabled: appointment.isVideoConsultation || appointment.appointmentType === AppointmentType.VIDEO_CALL,
        doctorName: doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Unknown Doctor',
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient',
      },
    };

    const isVideo = appointment.isVideoConsultation || appointment.appointmentType === AppointmentType.VIDEO_CALL;
    const channelLabel = isVideo ? 'video call' : 'in-person visit';
    const chatNote = notificationData.metadata?.chatEnabled ? ' Chat is open if you have questions.' : '';

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
      case 'reminder_24h':
        notificationData.title = 'Appointment in 24 hours';
        notificationData.message = `Reminder: ${channelLabel} tomorrow at ${appointment.appointmentTime}.${chatNote}`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
      case 'reminder_1h':
        notificationData.title = 'Appointment in 1 hour';
        notificationData.message = `Reminder: Your ${channelLabel} starts at ${appointment.appointmentTime}.${chatNote}`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
      case 'overdue':
        notificationData.title = 'Appointment Overdue';
        notificationData.message = `The appointment on ${appointment.appointmentDate} at ${appointment.appointmentTime} is overdue. Please complete the consultation.`;
        notificationData.priority = NotificationPriority.URGENT;
        break;
      case 'missed':
        notificationData.title = 'Appointment Missed';
        notificationData.message = `The appointment on ${appointment.appointmentDate} at ${appointment.appointmentTime} was missed.`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
    }

    if (patient) {
      const notification = await this.notificationsService.sendToUser(patient.id, notificationData as Notification);
      await this.emitNotification(patient.id, notification);
    }

    if (doctor) {
      const doctorNotification = await this.notificationsService.sendToUser(doctor.id, {
        ...notificationData,
        title: `Patient Appointment - ${notificationData.title}`,
        message: `Patient ${patient?.firstName} ${patient?.lastName} - ${notificationData.message}`,
      } as Notification);
      await this.emitNotification(doctor.id, doctorNotification);
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

    const notification = await this.notificationsService.sendToUser(patientId, notificationData as Notification);
    // Send real-time notification
    await this.notificationsGateway.sendNotification(patientId, notification);
  }

  async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<void> {
    const notification = await this.notificationsService.sendToUser(userId, {
      type: NotificationType.SYSTEM,
      priority: priority as NotificationPriority,
      title,
      message,
      userId,
    } as Notification);
    await this.emitNotification(userId, notification);
  }

  async createBulkSystemNotification(
    userIds: string[],
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<void> {
    const notifications = await this.notificationsService.sendToUsers(userIds, {
      type: NotificationType.SYSTEM,
      priority: priority as NotificationPriority,
      title,
      message,
    } as Notification);
    // Send real-time notifications
    for (let i = 0; i < notifications.length; i++) {
      await this.emitNotification(userIds[i], notifications[i]);
    }
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
    const now = new Date();
    const windows = [
      { type: 'reminder_24h' as const, startOffset: 1440 - 10, endOffset: 1440 + 10 },
      { type: 'reminder_1h' as const, startOffset: 60 - 10, endOffset: 60 + 10 },
    ];

    for (const window of windows) {
      const start = new Date(now.getTime() + window.startOffset * 60 * 1000);
      const end = new Date(now.getTime() + window.endOffset * 60 * 1000);
      const appointments = await this.notificationsService.getAppointmentsInWindow(start, end);

      for (const appointment of appointments) {
        await this.createAppointmentNotification(
          appointment,
          window.type,
          appointment.patient,
          appointment.doctor,
        );
      }
    }
  }

  async cleanupExpiredNotifications(): Promise<void> {
    await this.notificationsService.cleanupExpiredNotifications();
  }

  async getNotificationAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    return await this.notificationsService.getAnalytics(startDate, endDate);
  }
}

