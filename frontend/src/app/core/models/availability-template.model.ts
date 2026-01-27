export interface AvailabilityTemplate {
    id: string;
    doctorId: string;
    name: string;
    workingDays: number[]; // 0-6 (Sunday-Saturday)
    startTime: string;
    endTime: string;
    slotDuration: number;
    bufferMinutes: number;
    breaks: BreakPeriod[];
    validFrom?: Date | null;
    validTo?: Date | null;
    isDefault: boolean;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface BreakPeriod {
    startTime: string;
    endTime: string;
    label?: string;
}

export interface CreateTemplateDto {
    name: string;
    workingDays: number[];
    startTime: string;
    endTime: string;
    slotDuration?: number;
    bufferMinutes?: number;
    breaks?: BreakPeriod[];
    validFrom?: Date;
    validTo?: Date;
    description?: string;
    isDefault?: boolean;
}

export const PRESET_TEMPLATES: Partial<CreateTemplateDto>[] = [
    {
        name: 'Weekdays 9-5',
        workingDays: [1, 2, 3, 4, 5],
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        bufferMinutes: 5,
        breaks: [{ startTime: '12:00', endTime: '13:00', label: 'Lunch Break' }],
        description: 'Standard weekday schedule with lunch break',
    },
    {
        name: 'Morning Clinic',
        workingDays: [1, 2, 3, 4, 5],
        startTime: '08:00',
        endTime: '12:00',
        slotDuration: 20,
        bufferMinutes: 5,
        description: 'Morning-only clinic hours',
    },
    {
        name: 'Evening Clinic',
        workingDays: [1, 2, 3, 4, 5],
        startTime: '16:00',
        endTime: '20:00',
        slotDuration: 30,
        bufferMinutes: 5,
        description: 'Evening clinic hours for working patients',
    },
    {
        name: 'Mon-Wed-Fri',
        workingDays: [1, 3, 5],
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        bufferMinutes: 5,
        breaks: [{ startTime: '12:30', endTime: '13:30', label: 'Lunch' }],
        description: 'Alternate weekday schedule',
    },
];
