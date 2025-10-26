import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { NotificationPreferencesDto } from './dto/notification-preferences.dto';

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    info: number;
    success: number;
    warning: number;
    error: number;
    appointment: number;
    prescription: number;
    test_result: number;
    system: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreferences)
    private preferencesRepository: Repository<NotificationPreferences>,
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
  ) {}

  // Create notification
  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(createNotificationDto);
    return await this.notificationRepository.save(notification);
  }

  // Get all notifications for user
  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: string,
    priority?: string,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (priority) {
      queryBuilder.andWhere('notification.priority = :priority', { priority });
    }

    const [notifications, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { notifications, total };
  }

  // Get notification by ID
  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  // Update notification
  async update(id: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    const notification = await this.findOne(id);
    Object.assign(notification, updateNotificationDto);
    return await this.notificationRepository.save(notification);
  }

  // Delete notification
  async remove(id: string): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.remove(notification);
  }

  // Mark notification as read
  async markAsRead(id: string): Promise<void> {
    const notification = await this.findOne(id);
    notification.read = true;
    await this.notificationRepository.save(notification);
  }

  // Mark all notifications as read for user
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, read: false },
      { read: true }
    );
  }

  // Delete all notifications for user
  async deleteAllForUser(userId: string): Promise<void> {
    await this.notificationRepository.delete({ userId });
  }

  // Get notification statistics
  async getStats(userId: string): Promise<NotificationStats> {
    const total = await this.notificationRepository.count({ where: { userId } });
    const unread = await this.notificationRepository.count({ 
      where: { userId, read: false } 
    });

    const byType = await this.getStatsByType(userId);
    const byPriority = await this.getStatsByPriority(userId);

    return {
      total,
      unread,
      byType,
      byPriority,
    };
  }

  // Get stats by type
  private async getStatsByType(userId: string) {
    const types = ['info', 'success', 'warning', 'error', 'appointment', 'prescription', 'test_result', 'system'];
    const stats: any = {};

    for (const type of types) {
      stats[type] = await this.notificationRepository.count({
        where: { userId, type },
      });
    }

    return stats;
  }

  // Get stats by priority
  private async getStatsByPriority(userId: string) {
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const stats: any = {};

    for (const priority of priorities) {
      stats[priority] = await this.notificationRepository.count({
        where: { userId, priority },
      });
    }

    return stats;
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId, read: false },
    });
  }

  // Send notification to user
  async sendToUser(userId: string, notificationData: Partial<CreateNotificationDto>): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...notificationData,
      userId,
    });
    return await this.notificationRepository.save(notification);
  }

  // Send notification to multiple users
  async sendToUsers(userIds: string[], notificationData: Partial<CreateNotificationDto>): Promise<Notification[]> {
    const notifications = userIds.map(userId => 
      this.notificationRepository.create({
        ...notificationData,
        userId,
      })
    );
    return await this.notificationRepository.save(notifications);
  }

  // Send notification to users by role
  async sendToRole(role: string, notificationData: Partial<CreateNotificationDto>): Promise<Notification[]> {
    // This would require a join with the users table
    // For now, we'll implement a simplified version
    const notifications = this.notificationRepository.create({
      ...notificationData,
      // This would need to be implemented with proper user role filtering
    });
    return await this.notificationRepository.save([notifications]);
  }

  // Get notification preferences
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = this.preferencesRepository.create({
        userId,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        appointmentReminders: true,
        prescriptionAlerts: true,
        testResultAlerts: true,
        systemUpdates: true,
        marketingEmails: false,
        reminderTime: 30,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'UTC',
      });
      preferences = await this.preferencesRepository.save(preferences);
    }

    return preferences;
  }

  // Update notification preferences
  async updatePreferences(userId: string, preferencesDto: NotificationPreferencesDto): Promise<NotificationPreferences> {
    let preferences = await this.getPreferences(userId);
    Object.assign(preferences, preferencesDto);
    return await this.preferencesRepository.save(preferences);
  }

  // Get notification templates
  async getTemplates(): Promise<NotificationTemplate[]> {
    return await this.templateRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Create notification template
  async createTemplate(createTemplateDto: CreateNotificationTemplateDto): Promise<NotificationTemplate> {
    const template = this.templateRepository.create(createTemplateDto);
    return await this.templateRepository.save(template);
  }

  // Update notification template
  async updateTemplate(id: string, updateTemplateDto: UpdateNotificationTemplateDto): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    Object.assign(template, updateTemplateDto);
    return await this.templateRepository.save(template);
  }

  // Delete notification template
  async deleteTemplate(id: string): Promise<void> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    await this.templateRepository.remove(template);
  }

  // Get notification history
  async getHistory(userId?: string, startDate?: Date, endDate?: Date): Promise<Notification[]> {
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

    if (userId) {
      queryBuilder.where('notification.userId = :userId', { userId });
    }

    if (startDate) {
      queryBuilder.andWhere('notification.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('notification.createdAt <= :endDate', { endDate });
    }

    return await queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .getMany();
  }

  // Create appointment notification
  async createAppointmentNotification(
    userId: string,
    appointmentId: string,
    type: 'reminder' | 'confirmation' | 'cancellation' | 'reschedule',
    appointmentData?: any,
  ): Promise<Notification> {
    const notificationData: Partial<CreateNotificationDto> = {
      type: 'appointment',
      priority: 'medium',
      relatedEntityId: appointmentId,
      relatedEntityType: 'appointment',
      metadata: { appointmentId, ...appointmentData },
    };

    switch (type) {
      case 'reminder':
        notificationData.title = 'Appointment Reminder';
        notificationData.message = `You have an appointment scheduled for ${appointmentData?.appointmentDate} at ${appointmentData?.appointmentTime}`;
        notificationData.priority = 'high';
        break;
      case 'confirmation':
        notificationData.title = 'Appointment Confirmed';
        notificationData.message = `Your appointment with Dr. ${appointmentData?.doctorName} has been confirmed`;
        notificationData.priority = 'medium';
        break;
      case 'cancellation':
        notificationData.title = 'Appointment Cancelled';
        notificationData.message = `Your appointment scheduled for ${appointmentData?.appointmentDate} has been cancelled`;
        notificationData.priority = 'high';
        break;
      case 'reschedule':
        notificationData.title = 'Appointment Rescheduled';
        notificationData.message = `Your appointment has been rescheduled to ${appointmentData?.appointmentDate} at ${appointmentData?.appointmentTime}`;
        notificationData.priority = 'medium';
        break;
    }

    return await this.sendToUser(userId, notificationData);
  }

  // Create prescription notification
  async createPrescriptionNotification(
    userId: string,
    prescriptionId: string,
    type: 'ready' | 'refill' | 'expired',
    prescriptionData?: any,
  ): Promise<Notification> {
    const notificationData: Partial<CreateNotificationDto> = {
      type: 'prescription',
      priority: 'medium',
      relatedEntityId: prescriptionId,
      relatedEntityType: 'prescription',
      metadata: { prescriptionId, ...prescriptionData },
    };

    switch (type) {
      case 'ready':
        notificationData.title = 'Prescription Ready';
        notificationData.message = `Your prescription for ${prescriptionData?.medicationName} is ready for pickup`;
        notificationData.priority = 'medium';
        break;
      case 'refill':
        notificationData.title = 'Prescription Refill Needed';
        notificationData.message = `Your prescription for ${prescriptionData?.medicationName} needs to be refilled`;
        notificationData.priority = 'high';
        break;
      case 'expired':
        notificationData.title = 'Prescription Expired';
        notificationData.message = `Your prescription for ${prescriptionData?.medicationName} has expired`;
        notificationData.priority = 'high';
        break;
    }

    return await this.sendToUser(userId, notificationData);
  }

  // Create test result notification
  async createTestResultNotification(
    userId: string,
    testResultId: string,
    type: 'available' | 'abnormal' | 'normal',
    testData?: any,
  ): Promise<Notification> {
    const notificationData: Partial<CreateNotificationDto> = {
      type: 'test_result',
      priority: 'high',
      relatedEntityId: testResultId,
      relatedEntityType: 'test_result',
      metadata: { testResultId, ...testData },
    };

    switch (type) {
      case 'available':
        notificationData.title = 'Test Results Available';
        notificationData.message = `Your ${testData?.testName} results are now available`;
        notificationData.priority = 'high';
        break;
      case 'abnormal':
        notificationData.title = 'Abnormal Test Results';
        notificationData.message = `Your ${testData?.testName} results require immediate attention`;
        notificationData.priority = 'urgent';
        break;
      case 'normal':
        notificationData.title = 'Test Results Normal';
        notificationData.message = `Your ${testData?.testName} results are within normal range`;
        notificationData.priority = 'medium';
        break;
    }

    return await this.sendToUser(userId, notificationData);
  }

  // Create system notification
  async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<Notification> {
    return await this.sendToUser(userId, {
      type: 'system',
      priority,
      title,
      message,
    });
  }

  // Send bulk system notification
  async sendBulkSystemNotification(
    userIds: string[],
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ): Promise<Notification[]> {
    return await this.sendToUsers(userIds, {
      type: 'system',
      priority,
      title,
      message,
    });
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications(): Promise<void> {
    const now = new Date();
    await this.notificationRepository.delete({
      expiresAt: { $lt: now } as any,
    });
  }

  // Get notification analytics
  async getAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

    if (startDate) {
      queryBuilder.andWhere('notification.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('notification.createdAt <= :endDate', { endDate });
    }

    const total = await queryBuilder.getCount();
    const read = await queryBuilder.clone().andWhere('notification.read = true').getCount();
    const unread = total - read;

    const byType = await this.getStatsByType(null);
    const byPriority = await this.getStatsByPriority(null);

    return {
      total,
      read,
      unread,
      byType,
      byPriority,
      readRate: total > 0 ? (read / total) * 100 : 0,
    };
  }
}

