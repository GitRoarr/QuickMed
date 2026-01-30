import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserActiveDto {
  @ApiProperty({ required: true })
  @IsBoolean()
  isActive: boolean;
}
