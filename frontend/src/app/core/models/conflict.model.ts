export interface ConflictResult {
    hasConflict: boolean;
    conflicts: string[];
    warnings: string[];
}

export interface TimeSlot {
    startTime: string;
    endTime: string;
    status?: string;
    appointmentId?: string;
}

export interface ConflictCheckRequest {
    date: Date | string;
    startTime: string;
    endTime: string;
    excludeAppointmentId?: string;
}
