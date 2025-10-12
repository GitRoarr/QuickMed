import { IsString, IsOptional, IsDateString, IsEnum } from "class-validator"
import { AppointmentStatus } from "../entities/appointment.entity"

export class UpdateAppointmentDto {
  @IsDateString()
  @IsOptional()
  appointmentDate?: Date

  @IsString()
  @IsOptional()
  appointmentTime?: string

  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus

  @IsString()
  @IsOptional()
  notes?: string
}
