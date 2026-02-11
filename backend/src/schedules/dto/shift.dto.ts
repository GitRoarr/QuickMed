import { IsString, IsBoolean, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ShiftDto {
  @IsIn(['morning', 'afternoon', 'evening'])
  type: 'morning' | 'afternoon' | 'evening';

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
