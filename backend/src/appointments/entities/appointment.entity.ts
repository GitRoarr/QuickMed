import { Entity, Column, ManyToOne, JoinColumn } from "typeorm"
import { BaseEntity } from "../../common/entities/base.entity"
import { User } from "../../users/entities/user.entity"

export enum AppointmentStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

@Entity("appointments")
export class Appointment extends BaseEntity {
  @Column({ type: "date" })
  appointmentDate: Date

  @Column({ type: "time" })
  appointmentTime: string

  @Column({
    type: "enum",
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus

  @Column({ type: "text", nullable: true })
  notes: string

  @ManyToOne(
    () => User,
    (user) => user.patientAppointments,
  )
  @JoinColumn({ name: "patientId" })
  patient: User

  @Column()
  patientId: string

  @ManyToOne(
    () => User,
    (user) => user.doctorAppointments,
  )
  @JoinColumn({ name: "doctorId" })
  doctor: User

  @Column()
  doctorId: string
}
