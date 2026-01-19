import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsSeedService } from './notifications.seed';
import { NotificationIntegrationService } from './notification-integration.service';
import { NotificationsGateway } from './notifications.gateway';
import { forwardRef } from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { User } from '../users/entities/user.entity'; 
import { Appointment } from '../appointments/entities/appointment.entity';
import { UsersModule } from '../users/users.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreferences, NotificationTemplate, User, Appointment]),
    UsersModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'defaultSecret',
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationIntegrationService, NotificationsSeedService, NotificationsGateway],
  exports: [NotificationsService, NotificationIntegrationService, NotificationsGateway],
})
export class NotificationsModule {}