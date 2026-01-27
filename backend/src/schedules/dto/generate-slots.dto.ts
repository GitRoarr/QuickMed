import { IsDateString, IsOptional, IsString, IsInt, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BreakPeriod {
    @IsString()
    startTime: string; // HH:mm format

    @IsString()
    endTime: string; // HH:mm format

    @IsOptional()
    @IsString()
    label?: string;
}

export class GenerateSlotsDto {
    @IsDateString()
    date: string; // YYYY-MM-DD format

    @IsOptional()
    @IsDateString()
    endDate?: string; // Optional for date range generation

    @IsString()
    startTime: string; // HH:mm format (e.g., "09:00")

    @IsString()
    endTime: string; // HH:mm format (e.g., "17:00")

    @IsOptional()
    @IsInt()
    @Min(5)
    @Max(120)
    slotDuration?: number; // in minutes, default 30

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(60)
    bufferMinutes?: number; // buffer time between slots, default 0

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BreakPeriod)
    breaks?: BreakPeriod[]; // lunch breaks, etc.
}
