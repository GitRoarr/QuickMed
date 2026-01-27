import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('availability_templates')
@Index(['doctorId'])
export class AvailabilityTemplate extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    doctorId: string;

    @ManyToOne(() => User, { nullable: false })
    doctor: User;

    @Column({ length: 100 })
    name: string; // e.g., "Weekdays 9-5", "Morning Clinic", "Evening Clinic"

    @Column({ type: 'simple-array' })
    workingDays: number[]; // [1,2,3,4,5] = Monday-Friday

    @Column({ length: 5 })
    startTime: string; // e.g., "09:00"

    @Column({ length: 5 })
    endTime: string; // e.g., "17:00"

    @Column({ type: 'int', default: 30 })
    slotDuration: number; // in minutes

    @Column({ type: 'int', default: 0 })
    bufferMinutes: number; // buffer time between appointments

    @Column({ type: 'jsonb', nullable: true })
    breaks: { startTime: string; endTime: string; label?: string }[]; // lunch breaks, etc.

    @Column({ type: 'date', nullable: true })
    validFrom: Date; // start date of validity

    @Column({ type: 'date', nullable: true })
    validTo: Date; // end date of validity

    @Column({ type: 'boolean', default: false })
    isDefault: boolean; // is this the default template for the doctor

    @Column({ type: 'text', nullable: true })
    description: string;
}
