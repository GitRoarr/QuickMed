import { Entity, Column, OneToMany } from "typeorm"
import { BaseEntity } from "../../common/entities/base.entity"
import { Appointment } from "../../appointments/entities/appointment.entity"

export enum UserRole {
  PATIENT = "patient",
  DOCTOR = "doctor",
  ADMIN = "admin",
}

@Entity("users")
export class User extends BaseEntity {
  @Column()
  firstName: string

  @Column()
  lastName: string

  @Column({ unique: true })
  email: string

  @Column()
  password: string

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.PATIENT,
  })
  role: UserRole

  @Column({ nullable: true })
  phoneNumber: string

  @Column({ type: "text", nullable: true })
  medicalHistory: string

  // Doctor-specific fields
  @Column({ nullable: true })
  specialty: string

  @Column({ type: "text", nullable: true })
  bio: string

  @Column({ nullable: true })
  licenseNumber: string

  @Column({ type: "simple-array", nullable: true })
  availableDays: string[]

  @Column({ nullable: true })
  startTime: string

  @Column({ nullable: true })
  endTime: string

  @OneToMany(
    () => Appointment,
    (appointment) => appointment.patient,
  )
  patientAppointments: Appointment[]

  @OneToMany(
    () => Appointment,
    (appointment) => appointment.doctor,
  )
  doctorAppointments: Appointment[]
}
