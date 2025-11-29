import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class SetDoctorPasswordDto {
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
