import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export interface BreakPeriod {
    startTime: string;
    endTime: string;
    label: string;
    recurring: boolean; // applies every day
}

@Entity('break_configs')
@Index(['doctorId'])
export class BreakConfig extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    doctorId: string;

    @ManyToOne(() => User, { nullable: false })
    doctor: User;

    @Column({ type: 'jsonb', default: () => "'[]'" })
    breakPeriods: BreakPeriod[]; // multiple break periods

    @Column({ type: 'int', default: 0 })
    defaultBufferMinutes: number; // default buffer between appointments

    @Column({ type: 'boolean', default: true })
    autoApplyToSlots: boolean; // automatically exclude breaks from slot generation

    @Column({ type: 'text', nullable: true })
    notes: string;
}
