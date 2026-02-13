import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index, JoinColumn } from 'typeorm';
import { User } from '../users/entities/user.entity';

export type Break = {
  startTime: string;
  endTime: string;
  reason?: string;
};

export type ShiftStatus = 'past' | 'active' | 'upcoming';

export type Shift = {
  type: 'morning' | 'afternoon' | 'evening' | 'custom';
  startTime: string;
  endTime: string;
  slotDuration: number;
  enabled: boolean;
  status?: ShiftStatus;
  label?: string;
};

export type Slot = {
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'blocked' | 'break';
  appointmentId?: string | null;
  blockedReason?: string | null;
};

@Entity('doctor_schedule')
@Index(['doctorId', 'date'], { unique: true })
export class DoctorSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  doctorId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'doctorId' })
  doctor: User;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  slots: Slot[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  shifts: Shift[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  breaks: Break[];
}
