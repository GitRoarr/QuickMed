import { Injectable, BadRequestException } from '@nestjs/common';
import { Slot } from './schedule.entity';

export interface ConflictResult {
    hasConflict: boolean;
    conflicts: string[];
    warnings: string[];
}

export interface TimeSlot {
    startTime: string;
    endTime: string;
}

@Injectable()
export class ConflictDetectionService {
    /**
     * Check if two time ranges overlap
     */
    private timesOverlap(
        start1: string,
        end1: string,
        start2: string,
        end2: string,
    ): boolean {
        return (
            (start1 >= start2 && start1 < end2) ||
            (end1 > start2 && end1 <= end2) ||
            (start1 <= start2 && end1 >= end2)
        );
    }

    /**
     * Check if a time is in the past
     */
    private isPastTime(date: Date, time: string): boolean {
        const [h, m] = time.split(':').map(Number);
        const slotDateTime = new Date(date);
        slotDateTime.setHours(h || 0, m || 0, 0, 0);
        return slotDateTime.getTime() < Date.now();
    }

    /**
     * Check for conflicts when adding/modifying a slot
     */
    checkSlotConflicts(
        newSlot: TimeSlot,
        existingSlots: Slot[],
        date: Date,
        breaks?: { startTime: string; endTime: string }[],
    ): ConflictResult {
        const conflicts: string[] = [];
        const warnings: string[] = [];

        // Check if slot is in the past
        if (this.isPastTime(date, newSlot.endTime)) {
            conflicts.push('Cannot schedule appointments in the past');
        }

        // Check for overlaps with existing slots
        for (const slot of existingSlots) {
            const slotStart = slot.startTime || '';
            const slotEnd = slot.endTime || slotStart;

            if (this.timesOverlap(newSlot.startTime, newSlot.endTime, slotStart, slotEnd)) {
                if (slot.status === 'booked') {
                    conflicts.push(
                        `Overlaps with booked appointment at ${slotStart}-${slotEnd}`,
                    );
                } else if (slot.status === 'blocked') {
                    conflicts.push(`Overlaps with blocked time at ${slotStart}-${slotEnd}`);
                } else {
                    warnings.push(
                        `Overlaps with available slot at ${slotStart}-${slotEnd}`,
                    );
                }
            }
        }

        // Check for overlaps with break times
        if (breaks) {
            for (const breakPeriod of breaks) {
                if (
                    this.timesOverlap(
                        newSlot.startTime,
                        newSlot.endTime,
                        breakPeriod.startTime,
                        breakPeriod.endTime,
                    )
                ) {
                    conflicts.push(
                        `Overlaps with break time ${breakPeriod.startTime}-${breakPeriod.endTime}`,
                    );
                }
            }
        }

        return {
            hasConflict: conflicts.length > 0,
            conflicts,
            warnings,
        };
    }

    /**
     * Check for conflicts when rescheduling an appointment
     */
    checkRescheduleConflicts(
        appointmentId: string,
        newDate: Date,
        newTime: string,
        duration: number,
        existingSlots: Slot[],
        breaks?: { startTime: string; endTime: string }[],
    ): ConflictResult {
        const endTime = this.addMinutes(newTime, duration);

        // Filter out the current appointment from conflict check
        const otherSlots = existingSlots.filter(
            (s) => s.appointmentId !== appointmentId,
        );

        return this.checkSlotConflicts(
            { startTime: newTime, endTime },
            otherSlots,
            newDate,
            breaks,
        );
    }

    /**
     * Validate that a date range is logical
     */
    validateDateRange(
        startDate: Date | null,
        endDate: Date | null,
    ): ConflictResult {
        const conflicts: string[] = [];
        const warnings: string[] = [];

        if (startDate && endDate && startDate > endDate) {
            conflicts.push('Start date must be before end date');
        }

        if (startDate && startDate < new Date()) {
            warnings.push('Start date is in the past');
        }

        return {
            hasConflict: conflicts.length > 0,
            conflicts,
            warnings,
        };
    }

    /**
     * Check if multiple slots overlap with each other
     */
    checkMultipleSlotConflicts(slots: TimeSlot[]): ConflictResult {
        const conflicts: string[] = [];
        const warnings: string[] = [];

        for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
                if (
                    this.timesOverlap(
                        slots[i].startTime,
                        slots[i].endTime,
                        slots[j].startTime,
                        slots[j].endTime,
                    )
                ) {
                    conflicts.push(
                        `Slot ${i + 1} (${slots[i].startTime}-${slots[i].endTime}) overlaps with Slot ${j + 1} (${slots[j].startTime}-${slots[j].endTime})`,
                    );
                }
            }
        }

        return {
            hasConflict: conflicts.length > 0,
            conflicts,
            warnings,
        };
    }

    /**
     * Helper to add minutes to a time string
     */
    private addMinutes(time: string, minutes: number): string {
        const [h, m] = time.split(':').map(Number);
        const total = h * 60 + m + minutes;
        const hours = Math.floor((total % (24 * 60)) / 60);
        const mins = total % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
}
