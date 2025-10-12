import { IsString, IsNotEmpty, IsDateString, IsOptional, IsUUID } from "class-validator"

export class CreateAppointmentDto {
  @IsUUID()
  @IsNotEmpty()
  doctorId: string

  @IsDateString()
  @IsNotEmpty()
  appointmentDate: Date

  @IsString()
  @IsNotEmpty()
  appointmentTime: string

  @IsString()
  @IsOptional()
  notes?: string
}
