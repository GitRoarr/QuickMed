import { IsDateString, IsOptional, IsString, IsIn } from 'class-validator';

export class BulkSlotUpdateDto {
    @IsDateString()
    date: string; // YYYY-MM-DD format

    @IsString()
    startTime: string; // HH:mm format (e.g., "09:00")

    @IsString()
    endTime: string; // HH:mm format (e.g., "17:00")

    @IsIn(['available', 'blocked', 'booked'])
    status: 'available' | 'blocked' | 'booked';

    @IsOptional()
    @IsString()
    reason?: string; // Required when status is 'blocked'

    @IsOptional()
    @IsString()
    appointmentId?: string; // Used when status is 'booked'
}
