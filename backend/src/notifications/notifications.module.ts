import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationIntegrationService } from './notification-integration.service';
import { Notification } from './entities/notification.entity';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { NotificationTemplate } from './entities/notification-template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationPreferences, NotificationTemplate])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationIntegrationService],
  exports: [NotificationsService, NotificationIntegrationService],
})
export class NotificationsModule {}
