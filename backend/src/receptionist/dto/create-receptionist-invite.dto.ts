import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateReceptionistInviteDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
