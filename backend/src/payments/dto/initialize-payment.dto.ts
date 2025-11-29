import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEmail, Min } from 'class-validator';

export class InitializePaymentDto {
  @IsNotEmpty()
  @IsString()
  appointmentId: string;

  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number; // Optional, will use appointment default if not provided
}
