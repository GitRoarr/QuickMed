import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { UserRole } from "../../common/index";

@Entity('users')
export class User extends BaseEntity {
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PATIENT,
  })
  role: UserRole;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ type: 'text', nullable: true })
  medicalHistory: string;

  @Column({ nullable: true })
  patientId: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  bloodType: string;

  @Column({ type: 'simple-array', nullable: true })
  allergies: string[];

  @Column({ type: 'int', default: 0 })
  activeMedicationsCount: number;

  @Column({ type: 'int', default: 0 })
  medicalRecordsCount: number;

  @Column({ type: 'int', default: 0 })
  testResultsCount: number;

  @Column({ nullable: true })
  specialty: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ type: 'simple-array', nullable: true })
  availableDays: string[];

  @Column({ nullable: true })
  startTime: string;

  @Column({ nullable: true })
  endTime: string;

  @Column({ nullable: true })
  department: string;

  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  patientAppointments: Appointment[];

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  doctorAppointments: Appointment[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ nullable: true })
  inviteToken: string;

  @Column({ type: 'timestamp', nullable: true })
  inviteExpiresAt: Date;

  @Column({ type: 'boolean', default: false })
  mustChangePassword: boolean;

  @Column({ type: 'boolean', default: false })
  licenseValidated: boolean;

  @Column({ type: 'boolean', default: false })
  employmentConfirmed: boolean;
}
