import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional } from "class-validator"

export class RegisterDto {
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
  @IsOptional()
  medicalHistory?: string
}
