import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "../../users/entities/user.entity";

export enum MedicalRecordType {
  LAB = 'lab',
  PRESCRIPTION = 'prescription',
  IMAGING = 'imaging',
  DIAGNOSIS = 'diagnosis',
  OTHER = 'other'
}

@Entity('medical_records')
export class MedicalRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  title: string;

  @Column({ type: 'enum', enum: MedicalRecordType, default: MedicalRecordType.OTHER })
  type: MedicalRecordType;

  @Column({ type: 'timestamptz', nullable: true })
  recordDate: Date;

  @ManyToOne(() => User, (user) => user.id, { nullable: false })
  patient: User;

  @ManyToOne(() => User, (user) => user.id, { nullable: true })
  doctor?: User;

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
