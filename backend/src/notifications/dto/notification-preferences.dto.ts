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
  reminderTime?: number;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;
  @IsOptional()
  @IsString()
  quietHoursEnd?: string; 

  @IsOptional()
  @IsString()
  timezone?: string;
}

