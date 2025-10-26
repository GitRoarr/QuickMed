import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateNotificationTemplateDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  subject: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

