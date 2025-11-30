import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from "class-validator";
import { MedicalRecordType } from "../entities/medical-record.entity";

export class CreateMedicalRecordDto {
  @IsString()
  title: string;

  @IsEnum(MedicalRecordType)
  @IsOptional()
  type?: MedicalRecordType;

  @IsDateString()
  @IsOptional()
  recordDate?: string;

  @IsString()
  patientId: string;

  @IsString()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  status?: string;
}
