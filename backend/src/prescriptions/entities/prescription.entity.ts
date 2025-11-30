import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum PrescriptionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('prescriptions')
export class Prescription extends BaseEntity {
  @Column()
  medication: string;

  @Column()
  dosage: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column()
  patientId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'doctorId' })
  doctor: User;

  @Column()
  doctorId: string;

  @Column()
  frequency: string; // e.g., "Once daily", "Twice daily"

  @Column()
  duration: string; // e.g., "30 days", "90 days", "Ongoing"

  @Column({ type: 'date' })
  prescriptionDate: Date;

  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.ACTIVE,
  })
  status: PrescriptionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  instructions: string;
}
