
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { TreatmentType } from '../entities/treatment.entity';

class CreateTreatmentDto {
  @IsNotEmpty()
  @IsString()
  type: TreatmentType;

  @IsNotEmpty()
  @IsString()
  details: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateConsultationDto {
  @IsNotEmpty()
  @IsUUID()
  appointmentId: string;

  @IsNotEmpty()
  @IsString()
  notes: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTreatmentDto)
  treatments: CreateTreatmentDto[];
}
