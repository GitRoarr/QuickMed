import { IsString, IsOptional, IsDateString, IsEnum } from "class-validator"
import { AppointmentStatus } from "../../common/index"

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

  @IsOptional()
  @IsString()
  receptionistId?: string

  @IsOptional()
  arrived?: boolean

  @IsOptional()
  @IsString()
  paymentStatus?: string
}
