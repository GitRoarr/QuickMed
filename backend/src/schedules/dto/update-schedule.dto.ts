import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNotEmpty, ValidateNested } from 'class-validator';
import { ShiftDto } from './shift.dto';
import { BreakDto } from './break.dto';

export class UpdateScheduleDto {
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftDto)
  shifts: ShiftDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakDto)
  breaks: BreakDto[];
}
