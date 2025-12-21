import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CashPaymentDto {
  @IsString()
  appointmentId: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string; // default USD

  @IsOptional()
  @IsString()
  note?: string;
}
