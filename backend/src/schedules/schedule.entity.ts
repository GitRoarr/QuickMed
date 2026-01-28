import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import { User } from '../users/entities/user.entity';

export type Slot = {
  startTime?: string;
  endTime?: string;
  time?: string; 
  status: 'available' | 'booked' | 'blocked';
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
  doctor: User;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  slots: Slot[];

  @Column({ type: 'jsonb', nullable: true })
  sessions: {
    morning: boolean;
    break: boolean;
    evening: boolean;
  };

  @Column({ type: 'int', default: 30 })
  slotDuration: number;
}