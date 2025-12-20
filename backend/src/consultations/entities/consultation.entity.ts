import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'consultations' })
export class Consultation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  appointmentId!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  doctorId!: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  patientId!: string;

  @Column({ type: 'timestamptz' })
  startTime!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endTime!: Date | null;

  @Column({ type: 'integer', nullable: true })
  durationMin!: number | null;

  @Column({ type: 'numeric', precision: 3, scale: 2, nullable: true })
  rating!: number | null; // 1.00 - 5.00

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
