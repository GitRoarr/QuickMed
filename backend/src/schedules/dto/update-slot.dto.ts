import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateSlotDto {
  @IsDateString()
  date: string; // expects "YYYY-MM-DD" or ISO date

  // New range-based scheduling
  @IsOptional()
  @IsString()
  startTime?: string; // expects "HH:mm"

  @IsOptional()
  @IsString()
  endTime?: string; // expects "HH:mm"

  // Legacy single time support for backward compatibility
  @IsOptional()
  @IsString()
  time?: string; // expects "HH:mm"

  @IsOptional()
  @IsString()
  reason?: string;
}