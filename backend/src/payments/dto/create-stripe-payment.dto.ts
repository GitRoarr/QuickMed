import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEmail, Min } from 'class-validator';

export class CreateStripePaymentDto {
  @IsNotEmpty()
  @IsString()
  appointmentId: string;

  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}

export class ConfirmStripePaymentDto {
  @IsNotEmpty()
  @IsString()
  paymentIntentId: string;
}
