import { IsOptional, IsString } from 'class-validator';

export class StartConsultationDto {
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsString()
  doctorId!: string;

  @IsString()
  patientId!: string;
}
