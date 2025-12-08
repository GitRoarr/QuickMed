import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateSlotDto {
  @IsDateString()
  date: string; // expects "YYYY-MM-DD" or ISO date

  @IsString()
  time: string; // expects "HH:mm"

  @IsOptional()
  @IsString()
  reason?: string;
}