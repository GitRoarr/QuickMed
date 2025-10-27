import { Injectable } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationIntegrationService {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Appointment-related notifications
  async createAppointmentNotification(
    appointment: Appointment,
    type: 'created' | 'confirmed' | 'cancelled' | 'rescheduled' | 'reminder',
    patient?: User,
    doctor?: User,
  ): Promise<void> {
    const notificationData = {
      type: 'appointment',
      priority: 'medium',
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
        notificationData.priority = 'medium';
        break;
      case 'confirmed':
        notificationData.title = 'Appointment Confirmed';
        notificationData.message = `Your appointment with Dr. ${doctor?.firstName} ${doctor?.lastName} has been confirmed for ${appointment.appointmentDate} at ${appointment.appointmentTime}`;
        notificationData.priority = 'medium';
        break;
      case 'cancelled':
        notificationData.title = 'Appointment Cancelled';
        notificationData.message = `Your appointment scheduled for ${appointment.appointmentDate} at ${appointment.appointmentTime} has been cancelled`;
        notificationData.priority = 'high';
        break;
      case 'rescheduled':
        notificationData.title = 'Appointment Rescheduled';
        notificationData.message = `Your appointment has been rescheduled to ${appointment.appointmentDate} at ${appointment.appointmentTime}`;
        notificationData.priority = 'medium';
        break;
      case 'reminder':
        notificationData.title = 'Appointment Reminder';
        notificationData.message = `You have an appointment with Dr. ${doctor?.firstName} ${doctor?.lastName} tomorrow at ${appointment.appointmentTime}`;
        notificationData.priority = 'high';
        break;
    }

    // Send to patient
    if (patient) {
      await this.notificationsService.sendToUser(patient.id, {
        ...notificationData,
        userId: patient.id,
      });
    }

    // Send to doctor
    if (doctor) {
      await this.notificationsService.sendToUser(doctor.id, {
        ...notificationData,
        userId: doctor.id,
        title: `Patient Appointment - ${notificationData.title}`,
        message: `Patient ${patient?.firstName} ${patient?.lastName} - ${notificationData.message}`,
      });
    }
  }

  // Prescription-related notifications
  async createPrescriptionNotification(
    prescriptionId: string,
    patientId: string,
    type: 'ready' | 'refill' | 'expired',
    medicationName?: string,
  ): Promise<void> {
    const notificationData = {
      type: 'prescription',
      priority: 'medium',
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
        notificationData.priority = 'medium';
        break;
      case 'refill':
        notificationData.title = 'Prescription Refill Needed';
        notificationData.message = `Your prescription for ${medicationName || 'medication'} needs to be refilled`;
        notificationData.priority = 'high';
        break;
      case 'expired':
        notificationData.title = 'Prescription Expired';
        notificationData.message = `Your prescription for ${medicationName || 'medication'} has expired`;
        notificationData.priority = 'high';
        break;
    }

    await this.notificationsService.sendToUser(patientId, {
      ...notificationData,
      userId: patientId,
    });
  }

  // Test result notifications
  async createTestResultNotification(
    testResultId: string,
    patientId: string,
    type: 'available' | 'abnormal' | 'normal',
    testName?: string,
  ): Promise<void> {
    const notificationData = {
      type: 'test_result',
      priority: 'high',
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
        notificationData.priority = 'high';
        break;
      case 'abnormal':
        notificationData.title = 'Abnormal Test Results';
        notificationData.message = `Your ${testName || 'test'} results require immediate attention. Please contact your doctor.`;
        notificationData.priority = 'urgent';
        break;
      case 'normal':
        notificationData.title = 'Test Results Normal';
        notificationData.message = `Your ${testName || 'test'} results are within normal range`;
        notificationData.priority = 'medium';
        break;
    }

    await this.notificationsService.sendToUser(patientId, {
      ...notificationData,
      userId: patientId,
    });
  }

  // System notifications
  async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<void> {
    await this.notificationsService.sendToUser(userId, {
      type: 'system',
      priority,
      title,
      message,
      userId,
    });
  }

  // Bulk system notifications
  async createBulkSystemNotification(
    userIds: string[],
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<void> {
    await this.notificationsService.sendToUsers(userIds, {
      type: 'system',
      priority,
      title,
      message,
    });
  }

  // Role-based notifications
  async createRoleBasedNotification(
    role: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<void> {
    await this.notificationsService.sendToRole(role, {
      type: 'system',
      priority,
      title,
      message,
    });
  }

  // Appointment reminder service
  async sendAppointmentReminders(): Promise<void> {
    // This would typically be called by a cron job
    // Implementation would query for appointments tomorrow and send reminders
    console.log('Sending appointment reminders...');
  }

  // Cleanup expired notifications
  async cleanupExpiredNotifications(): Promise<void> {
    await this.notificationsService.cleanupExpiredNotifications();
  }

  // Get notification analytics
  async getNotificationAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    return await this.notificationsService.getAnalytics(startDate, endDate);
  }
}


