import { IsString, IsEmail, IsEnum, IsOptional, IsDate, IsInt, IsArray, MinLength, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@/common/index';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ required: false, enum: UserRole, enumName: 'UserRole' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  dateOfBirth?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  activeMedicationsCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  medicalRecordsCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  testResultsCount?: number;

  @ApiProperty({ required: false, description: 'Relevant only for doctors' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiProperty({ required: false, description: 'Relevant only for doctors' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false, description: 'Relevant only for doctors' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ required: false, description: 'Relevant only for doctors' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableDays?: string[];

  @ApiProperty({ required: false, description: 'Relevant only for doctors' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ required: false, description: 'Relevant only for doctors' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiProperty({ required: false, description: 'Relevant only for doctors' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}