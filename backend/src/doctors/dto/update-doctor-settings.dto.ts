import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateDoctorSettingsDto {
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsString()
  theme?: string;

  // Add more settings fields as needed
}
