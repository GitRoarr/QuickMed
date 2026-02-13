import { IsEmail, IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  personalMessage?: string;
}

export class BulkInviteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceptionistInviteDto)
  invites: CreateReceptionistInviteDto[];
}

export class ResendInviteDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class RevokeInviteDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
