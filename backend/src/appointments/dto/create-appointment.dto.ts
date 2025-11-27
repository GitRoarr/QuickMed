import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from "class-validator"
import { AppointmentStatus, AppointmentType } from "../../common"

export class CreateAppointmentDto {
  @IsUUID()
  @IsNotEmpty()
  doctorId: string

  @IsUUID()
  @IsNotEmpty()
  patientId: string

  @IsDateString()
  @IsNotEmpty()
  appointmentDate: Date

  @IsString()
  @IsNotEmpty()
  appointmentTime: string

  @IsEnum(AppointmentType)
  @IsOptional()
  appointmentType?: AppointmentType

  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus

  @IsString()
  @IsOptional()
  notes?: string

  @IsString()
  @IsOptional()
  reason?: string

  @IsString()
  @IsOptional()
  location?: string

  @IsBoolean()
  @IsOptional()
  isVideoConsultation?: boolean

  @IsInt()
  @IsOptional()
  @Min(15)
  duration?: number

  // optional receptionist id (normally set from auth token)
  @IsOptional()
  @IsString()
  receptionistId?: string
}