import { Injectable } from '@angular/core';
import { DoctorSlot } from './schedule.service';
import { ConflictResult, TimeSlot } from '../models/conflict.model';

@Injectable({
    providedIn: 'root'
})
export class ConflictDetectionService {
    /**
     * Check if two time ranges overlap
     */
    private timesOverlap(
        start1: string,
        end1: string,
        start2: string,
        end2: string
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
        existingSlots: DoctorSlot[],
        date: Date,
        breaks?: { startTime: string; endTime: string }[]
    ): ConflictResult {
        const conflicts: string[] = [];
        const warnings: string[] = [];

        // Check if slot is in the past
        if (this.isPastTime(date, newSlot.endTime)) {
            conflicts.push('Cannot schedule appointments in the past');
        }

        // Check for overlaps with existing slots
        for (const slot of existingSlots) {
            const slotStart = slot.startTime || slot.time || '';
            const slotEnd = slot.endTime || slotStart;

            if (this.timesOverlap(newSlot.startTime, newSlot.endTime, slotStart, slotEnd)) {
                if (slot.status === 'booked') {
                    conflicts.push(`Overlaps with booked appointment at ${slotStart}-${slotEnd}`);
                } else if (slot.status === 'blocked') {
                    conflicts.push(`Overlaps with blocked time at ${slotStart}-${slotEnd}`);
                } else {
                    warnings.push(`Overlaps with available slot at ${slotStart}-${slotEnd}`);
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
                        breakPeriod.endTime
                    )
                ) {
                    conflicts.push(
                        `Overlaps with break time ${breakPeriod.startTime}-${breakPeriod.endTime}`
                    );
                }
            }
        }

        return {
            hasConflict: conflicts.length > 0,
            conflicts,
            warnings
        };
    }

    /**
     * Validate that a date range is logical
     */
    validateDateRange(startDate: Date | null, endDate: Date | null): ConflictResult {
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
            warnings
        };
    }

    /**
     * Helper to add minutes to a time string
     */
    addMinutes(time: string, minutes: number): string {
        const [h, m] = time.split(':').map(Number);
        const total = h * 60 + m + minutes;
        const hours = Math.floor((total % (24 * 60)) / 60);
        const mins = total % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
}
