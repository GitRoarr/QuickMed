import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsArray } from "class-validator"

export class CreateDoctorDto {
  @IsString()
  @IsNotEmpty()
  firstName: string

  @IsString()
  @IsNotEmpty()
  lastName: string

  @IsEmail()
  @IsNotEmpty()
  email: string

  @IsString()
  @MinLength(6)
  password: string

  @IsString()
  @IsNotEmpty()
  phoneNumber: string

  @IsString()
  @IsNotEmpty()
  specialty: string

  @IsString()
  @IsOptional()
  bio?: string

  @IsString()
  @IsNotEmpty()
  licenseNumber: string

  @IsArray()
  @IsOptional()
  availableDays?: string[]

  @IsString()
  @IsOptional()
  startTime?: string

  @IsString()
  @IsOptional()
  endTime?: string
}
