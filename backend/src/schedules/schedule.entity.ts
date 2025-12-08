import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import { User } from '../users/entities/user.entity';

export type Slot = {
  time: string; // "08:00"
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

  // use Date type for TypeORM `date` column
  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  slots: Slot[];
}