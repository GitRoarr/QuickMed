import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { PrescriptionStatus } from '../entities/prescription.entity';

export class CreatePrescriptionDto {
  @IsString()
  @IsNotEmpty()
  medication: string;

  @IsString()
  @IsNotEmpty()
  dosage: string;

  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsNotEmpty()
  frequency: string;

  @IsString()
  @IsNotEmpty()
  duration: string;

  @IsDateString()
  @IsOptional()
  prescriptionDate?: string;

  @IsEnum(PrescriptionStatus)
  @IsOptional()
  status?: PrescriptionStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  instructions?: string;
}
