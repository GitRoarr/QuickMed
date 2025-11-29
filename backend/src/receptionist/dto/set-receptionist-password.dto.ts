import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SetReceptionistPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  uid: string;
}
