import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../common/index';

export class SendReceptionistMessageDto {
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @IsEnum(UserRole)
  receiverRole: UserRole;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  subject?: string;
}
