import { IsString, IsBoolean, IsNumber, IsIn, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ShiftDto {
  @IsIn(['morning', 'afternoon', 'evening', 'night', 'custom'])
  type: 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @Type(() => Number)
  @IsNumber()
  slotDuration: number;

  @IsBoolean()
  enabled: boolean;
}
