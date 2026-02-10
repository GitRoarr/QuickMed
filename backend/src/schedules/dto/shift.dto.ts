import { IsString, IsBoolean, IsNumber, IsIn } from 'class-validator';

export class ShiftDto {
  @IsIn(['morning', 'afternoon', 'evening'])
  type: 'morning' | 'afternoon' | 'evening';

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsNumber()
  slotDuration: number;

  @IsBoolean()
  enabled: boolean;
}
