import { Entity, Column, ManyToOne, JoinColumn } from "typeorm"
import { BaseEntity } from "../../common/entities/base.entity"
import { User } from "../../users/entities/user.entity"

export enum AppointmentStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
  WAITING = "waiting",
  IN_PROGRESS = "in-progress",
  SCHEDULED = "scheduled",
}

export enum AppointmentType {
  CONSULTATION = "Consultation",
  FOLLOW_UP = "Follow-up",
  NEW_PATIENT = "New Patient",
  VIDEO_CALL = "Video Call",
  CHECKUP = "Checkup",
}

@Entity("appointments")
export class Appointment extends BaseEntity {
  @Column({ type: "date" })
  appointmentDate: Date

  @Column({ type: "time" })
  appointmentTime: string

  @Column({ type: "int", default: 30 })
  duration: number

  @Column({
    type: "enum",
    enum: AppointmentType,
    default: AppointmentType.CONSULTATION,
  })
  appointmentType: AppointmentType

  @Column({ type: "varchar", length: 255, nullable: true })
  reason: string

  @Column({
    type: "enum",
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus

  @Column({ type: "text", nullable: true })
  notes: string

  @Column({ type: "varchar", length: 255, nullable: true })
  location: string

  @Column({ type: "boolean", default: false })
  isVideoConsultation: boolean

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
