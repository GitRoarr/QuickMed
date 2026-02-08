
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Consultation } from "./consultation.entity";

export enum TreatmentType {
  MEDICATION = 'medication',
  THERAPY = 'therapy',
  PROCEDURE = 'procedure',
  LAB_TEST = 'lab_test',
}

@Entity()
export class Treatment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  consultationId: string;

  @ManyToOne(() => Consultation, consultation => consultation.treatments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'consultationId' })
  consultation: Consultation;

  @Column({
    type: 'enum',
    enum: TreatmentType,
  })
  type: TreatmentType;

  @Column('text')
  details: string; // E.g., "Ibuprofen 200mg", "Physical Therapy session", "Blood test"

  @Column('text', { nullable: true })
  instructions: string; // E.g., "Take one tablet every 4-6 hours"

  @Column({ default: false })
  administered: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
