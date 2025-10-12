import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common"
import type { Repository } from "typeorm"
import { type Appointment, AppointmentStatus } from "./entities/appointment.entity"
import type { CreateAppointmentDto } from "./dto/create-appointment.dto"
import type { UpdateAppointmentDto } from "./dto/update-appointment.dto"
import type { UsersService } from "../users/users.service"
import { type User, UserRole } from "../users/entities/user.entity"

@Injectable()
export class AppointmentsService {
  constructor(
    private appointmentsRepository: Repository<Appointment>, // Removed decorator from here
    private usersService: UsersService,
  ) {}

  async create(createAppointmentDto: CreateAppointmentDto, patientId: string): Promise<Appointment> {
    const { doctorId, appointmentDate, appointmentTime, notes } = createAppointmentDto

    // Verify doctor exists and has doctor role
    const doctor = await this.usersService.findOne(doctorId)
    if (doctor.role !== UserRole.DOCTOR) {
      throw new BadRequestException("Selected user is not a doctor")
    }

    // Check if appointment slot is available
    const existingAppointment = await this.appointmentsRepository.findOne({
      where: {
        doctorId,
        appointmentDate,
        appointmentTime,
        status: AppointmentStatus.CONFIRMED,
      },
    })

    if (existingAppointment) {
      throw new BadRequestException("This time slot is already booked. Please choose another time.")
    }

    const appointment = this.appointmentsRepository.create({
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      notes,
      status: AppointmentStatus.PENDING,
    })

    return this.appointmentsRepository.save(appointment)
  }

  async findAll(): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      relations: ["patient", "doctor"],
      order: { appointmentDate: "DESC", appointmentTime: "DESC" },
    })
  }

  async findByPatient(patientId: string): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: { patientId },
      relations: ["doctor"],
      order: { appointmentDate: "DESC", appointmentTime: "DESC" },
    })
  }

  async findByDoctor(doctorId: string): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: { doctorId },
      relations: ["patient"],
      order: { appointmentDate: "DESC", appointmentTime: "DESC" },
    })
  }

  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: ["patient", "doctor"],
    })

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`)
    }

    return appointment
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto, user: User): Promise<Appointment> {
    const appointment = await this.findOne(id)

    // Authorization check
    if (user.role === UserRole.PATIENT && appointment.patientId !== user.id) {
      throw new ForbiddenException("You can only update your own appointments")
    }

    if (user.role === UserRole.DOCTOR && appointment.doctorId !== user.id) {
      throw new ForbiddenException("You can only update appointments assigned to you")
    }

    // If changing time/date, check availability
    if (updateAppointmentDto.appointmentDate || updateAppointmentDto.appointmentTime) {
      const newDate = updateAppointmentDto.appointmentDate || appointment.appointmentDate
      const newTime = updateAppointmentDto.appointmentTime || appointment.appointmentTime

      const conflictingAppointment = await this.appointmentsRepository.findOne({
        where: {
          doctorId: appointment.doctorId,
          appointmentDate: newDate,
          appointmentTime: newTime,
          status: AppointmentStatus.CONFIRMED,
        },
      })

      if (conflictingAppointment && conflictingAppointment.id !== id) {
        throw new BadRequestException("This time slot is already booked")
      }
    }

    Object.assign(appointment, updateAppointmentDto)
    return this.appointmentsRepository.save(appointment)
  }

  async cancel(id: string, user: User): Promise<Appointment> {
    const appointment = await this.findOne(id)

    // Authorization check
    if (user.role === UserRole.PATIENT && appointment.patientId !== user.id) {
      throw new ForbiddenException("You can only cancel your own appointments")
    }

    if (user.role === UserRole.DOCTOR && appointment.doctorId !== user.id) {
      throw new ForbiddenException("You can only cancel appointments assigned to you")
    }

    appointment.status = AppointmentStatus.CANCELLED
    return this.appointmentsRepository.save(appointment)
  }

  async remove(id: string): Promise<void> {
    const result = await this.appointmentsRepository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException(`Appointment with ID ${id} not found`)
    }
  }
}
