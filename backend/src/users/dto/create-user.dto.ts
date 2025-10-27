import { IsString, IsEmail, MinLength, IsEnum, IsOptional, IsDate, IsInt, IsArray, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/index';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  @IsEnum(UserRole)
  role: UserRole;

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
}