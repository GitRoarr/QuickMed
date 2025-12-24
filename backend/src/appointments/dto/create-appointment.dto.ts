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
import { Transform } from "class-transformer"
import { AppointmentStatus, AppointmentType } from "../../common"

export class CreateAppointmentDto {
  @IsUUID()
  @IsNotEmpty()
  doctorId: string

  // Patient id is inferred from auth token on the server
  // If client sends an empty string, normalize it to undefined so @IsOptional skips validation
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  @IsOptional()
  patientId?: string

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