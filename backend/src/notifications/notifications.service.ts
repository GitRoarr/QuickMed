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
import { NotificationType, NotificationPriority, AppointmentStatus, UserRole } from '../common/index'; // Updated import path
import { AppointmentType } from '../common/index'; // Import AppointmentType
import { LessThan, Between } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    [key in NotificationType]?: number;
  };
  byPriority: {
    [key in NotificationPriority]?: number;
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
  ) {}

  private combineDateAndTime(dateVal: Date, timeVal: string): Date {
    const date = new Date(dateVal);
    const [hours, minutes] = (timeVal || '00:00').split(':').map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  }

  private isVideoAppointment(appointment: Appointment): boolean {
    return appointment.isVideoConsultation || appointment.appointmentType === AppointmentType.VIDEO_CALL;
  }

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(createNotificationDto);
    return await this.notificationRepository.save(notification);
  }

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: NotificationType,
    priority?: NotificationPriority,
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

  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    const notification = await this.findOne(id);
    Object.assign(notification, updateNotificationDto);
    return await this.notificationRepository.save(notification);
  }

  async remove(id: string): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.remove(notification);
  }

  async markAsRead(id: string): Promise<void> {
    const notification = await this.findOne(id);
    notification.read = true;
    await this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, read: false },
      { read: true }
    );
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.notificationRepository.delete({ userId });
  }

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

  private async getStatsByType(userId: string | null): Promise<{ [key in NotificationType]?: number }> {
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');
    if (userId) {
      queryBuilder.where('notification.userId = :userId', { userId });
    }
    const stats = await queryBuilder
      .select('notification.type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.type')
      .getRawMany();

    return stats.reduce((acc, { type, count }) => ({
      ...acc,
      [type as NotificationType]: Number(count),
    }), {});
  }

  private async getStatsByPriority(userId: string | null): Promise<{ [key in NotificationPriority]?: number }> {
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');
    if (userId) {
      queryBuilder.where('notification.userId = :userId', { userId });
    }
    const stats = await queryBuilder
      .select('notification.priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.priority')
      .getRawMany();

    return stats.reduce((acc, { priority, count }) => ({
      ...acc,
      [priority as NotificationPriority]: Number(count),
    }), {});
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId, read: false },
    });
  }

  async sendToUser(userId: string, notificationData: Partial<CreateNotificationDto>): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...notificationData,
      userId,
      read: false,
    });
    return await this.notificationRepository.save(notification);
  }

  async sendToUsers(userIds: string[], notificationData: Partial<CreateNotificationDto>): Promise<Notification[]> {
    const notifications = userIds.map(userId => 
      this.notificationRepository.create({
        ...notificationData,
        userId,
        read: false,
      })
    );
    return await this.notificationRepository.save(notifications);
  }

  async sendToRole(role: UserRole, notificationData: Partial<CreateNotificationDto>): Promise<Notification[]> {
    const users = await this.userRepository.find({ where: { role } });
    if (!users.length) throw new NotFoundException('No users found for this role');
    const notifications = users.map(user => 
      this.notificationRepository.create({
        ...notificationData,
        userId: user.id,
        read: false,
      })
    );
    return await this.notificationRepository.save(notifications);
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
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

  async updatePreferences(userId: string, preferencesDto: NotificationPreferencesDto): Promise<NotificationPreferences> {
    let preferences = await this.getPreferences(userId);
    Object.assign(preferences, preferencesDto);
    return await this.preferencesRepository.save(preferences);
  }

  async getTemplates(): Promise<NotificationTemplate[]> {
    return await this.templateRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createTemplate(createTemplateDto: CreateNotificationTemplateDto): Promise<NotificationTemplate> {
    const template = this.templateRepository.create(createTemplateDto);
    return await this.templateRepository.save(template);
  }

  async updateTemplate(id: string, updateTemplateDto: UpdateNotificationTemplateDto): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    Object.assign(template, updateTemplateDto);
    return await this.templateRepository.save(template);
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    await this.templateRepository.remove(template);
  }

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

  async createAppointmentNotification(
    userId: string,
    appointmentId: string,
    type: 'reminder' | 'confirmation' | 'cancellation' | 'reschedule',
    appointmentData?: any,
  ): Promise<Notification> {
    const notificationData: Partial<CreateNotificationDto> = {
      type: NotificationType.APPOINTMENT,
      priority: NotificationPriority.MEDIUM,
      relatedEntityId: appointmentId,
      relatedEntityType: 'appointment',
      metadata: { appointmentId, ...appointmentData },
    };

    switch (type) {
      case 'reminder':
        notificationData.title = 'Appointment Reminder';
        notificationData.message = `You have an appointment scheduled for ${appointmentData?.appointmentDate} at ${appointmentData?.appointmentTime}`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
      case 'confirmation':
        notificationData.title = 'Appointment Confirmed';
        notificationData.message = `Your appointment with Dr. ${appointmentData?.doctorName} has been confirmed`;
        notificationData.priority = NotificationPriority.MEDIUM;
        break;
      case 'cancellation':
        notificationData.title = 'Appointment Cancelled';
        notificationData.message = `Your appointment scheduled for ${appointmentData?.appointmentDate} has been cancelled`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
      case 'reschedule':
        notificationData.title = 'Appointment Rescheduled';
        notificationData.message = `Your appointment has been rescheduled to ${appointmentData?.appointmentDate} at ${appointmentData?.appointmentTime}`;
        notificationData.priority = NotificationPriority.MEDIUM;
        break;
    }

    return await this.sendToUser(userId, notificationData as CreateNotificationDto);
  }

  async createPrescriptionNotification(
    userId: string,
    prescriptionId: string,
    type: 'ready' | 'refill' | 'expired',
    prescriptionData?: any,
  ): Promise<Notification> {
    const notificationData: Partial<CreateNotificationDto> = {
      type: NotificationType.PRESCRIPTION,
      priority: NotificationPriority.MEDIUM,
      relatedEntityId: prescriptionId,
      relatedEntityType: 'prescription',
      metadata: { prescriptionId, ...prescriptionData },
    };

    switch (type) {
      case 'ready':
        notificationData.title = 'Prescription Ready';
        notificationData.message = `Your prescription for ${prescriptionData?.medicationName} is ready for pickup`;
        notificationData.priority = NotificationPriority.MEDIUM;
        break;
      case 'refill':
        notificationData.title = 'Prescription Refill Needed';
        notificationData.message = `Your prescription for ${prescriptionData?.medicationName} needs to be refilled`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
      case 'expired':
        notificationData.title = 'Prescription Expired';
        notificationData.message = `Your prescription for ${prescriptionData?.medicationName} has expired`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
    }

    return await this.sendToUser(userId, notificationData as CreateNotificationDto);
  }

  async createTestResultNotification(
    userId: string,
    testResultId: string,
    type: 'available' | 'abnormal' | 'normal',
    testData?: any,
  ): Promise<Notification> {
    const notificationData: Partial<CreateNotificationDto> = {
      type: NotificationType.TEST_RESULT,
      priority: NotificationPriority.HIGH,
      relatedEntityId: testResultId,
      relatedEntityType: 'test_result',
      metadata: { testResultId, ...testData },
    };

    switch (type) {
      case 'available':
        notificationData.title = 'Test Results Available';
        notificationData.message = `Your ${testData?.testName} results are now available`;
        notificationData.priority = NotificationPriority.HIGH;
        break;
      case 'abnormal':
        notificationData.title = 'Abnormal Test Results';
        notificationData.message = `Your ${testData?.testName} results require immediate attention`;
        notificationData.priority = NotificationPriority.URGENT;
        break;
      case 'normal':
        notificationData.title = 'Test Results Normal';
        notificationData.message = `Your ${testData?.testName} results are within normal range`;
        notificationData.priority = NotificationPriority.MEDIUM;
        break;
    }

    return await this.sendToUser(userId, notificationData as CreateNotificationDto);
  }

  async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
  ): Promise<Notification> {
    return await this.sendToUser(userId, {
      type: NotificationType.SYSTEM,
      priority,
      title,
      message,
    } as CreateNotificationDto);
  }

  async sendBulkSystemNotification(
    userIds: string[],
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
  ): Promise<Notification[]> {
    return await this.sendToUsers(userIds, {
      type: NotificationType.SYSTEM,
      priority,
      title,
      message,
    } as CreateNotificationDto);
  }

  async cleanupExpiredNotifications(): Promise<void> {
    const now = new Date('2025-10-28T00:24:00Z'); 
    await this.notificationRepository.delete({
      expiresAt: LessThan(now),
    });
  }

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

  async getAppointmentsInWindow(start: Date, end: Date): Promise<Appointment[]> {
    const startDateOnly = new Date(start);
    startDateOnly.setHours(0, 0, 0, 0);
    const endDateOnly = new Date(end);
    endDateOnly.setHours(23, 59, 59, 999);

    const candidates = await this.appointmentRepository.find({
      where: {
        appointmentDate: Between(startDateOnly, endDateOnly),
        status: AppointmentStatus.CONFIRMED,
      },
      relations: ['patient', 'doctor'],
    });

    return candidates.filter((appointment) => {
      const apptDateTime = this.combineDateAndTime(appointment.appointmentDate, appointment.appointmentTime);
      return apptDateTime >= start && apptDateTime <= end;
    });
  }

  async getTomorrowAppointments(date: Date): Promise<Appointment[]> {
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const nextDay = new Date(tomorrow);
    nextDay.setDate(nextDay.getDate() + 1);

    return await this.appointmentRepository.find({
      where: {
        appointmentDate: Between(tomorrow, nextDay),
        status: AppointmentStatus.CONFIRMED,
      },
      relations: ['patient', 'doctor'],
    });
  }
}