import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class ApplyTemplateDto {
    @IsUUID()
    templateId: string;

    @IsDateString()
    startDate: string; // YYYY-MM-DD format

    @IsOptional()
    @IsDateString()
    endDate?: string; // Optional - if not provided, applies to single day only

    @IsOptional()
    @IsString()
    reason?: string; // Optional reason for applying the template
}
