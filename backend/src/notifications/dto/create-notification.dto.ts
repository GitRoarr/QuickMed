import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString, IsObject } from 'class-validator';
import { NotificationType, NotificationPriority } from '../../common/index';

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  relatedEntityId?: string;

  @IsEnum(['appointment', 'prescription', 'test_result', 'user', 'system'])
  @IsOptional()
  relatedEntityType?: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  actionText?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}