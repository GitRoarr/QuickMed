import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @IsNotEmpty()
  @IsString()
  transactionId: string; // Our internal transaction ID
}
