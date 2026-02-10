import { IsString, IsOptional } from 'class-validator';

export class BreakDto {
  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
