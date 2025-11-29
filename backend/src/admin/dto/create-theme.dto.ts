import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class CreateThemeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(['light', 'dark'])
  @IsOptional()
  mode?: 'light' | 'dark';

  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  primaryHover?: string;

  @IsString()
  @IsOptional()
  primaryLight?: string;

  @IsString()
  @IsOptional()
  backgroundLight?: string;

  @IsString()
  @IsOptional()
  sidebarBg?: string;

  @IsString()
  @IsOptional()
  backgroundGray?: string;

  @IsString()
  @IsOptional()
  textDark?: string;

  @IsString()
  @IsOptional()
  textGray?: string;

  @IsString()
  @IsOptional()
  textMuted?: string;

  @IsString()
  @IsOptional()
  borderColor?: string;

  @IsString()
  @IsOptional()
  cardShadow?: string;

  @IsString()
  @IsOptional()
  statusConfirmed?: string;

  @IsString()
  @IsOptional()
  statusPending?: string;

  @IsString()
  @IsOptional()
  statusCompleted?: string;

  @IsString()
  @IsOptional()
  statusCancelled?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
