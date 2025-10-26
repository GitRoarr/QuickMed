import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString, IsObject } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(['info', 'success', 'warning', 'error', 'appointment', 'prescription', 'test_result', 'system'])
  type: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority: string;

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

