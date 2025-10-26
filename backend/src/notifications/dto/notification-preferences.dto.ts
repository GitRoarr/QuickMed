import { IsBoolean, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  appointmentReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  prescriptionAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  testResultAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  systemUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  reminderTime?: number; // minutes before appointment

  @IsOptional()
  @IsString()
  quietHoursStart?: string; // HH:mm format

  @IsOptional()
  @IsString()
  quietHoursEnd?: string; // HH:mm format

  @IsOptional()
  @IsString()
  timezone?: string;
}

