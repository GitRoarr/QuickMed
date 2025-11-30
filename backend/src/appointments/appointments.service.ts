import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Appointment} from "./entities/appointment.entity";
import {AppointmentStatus,UserRole,PaymentStatus} from '../common/index'
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { UsersService } from "../users/users.service";
import { User} from "../users/entities/user.entity";

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    private readonly usersService: UsersService,
    private readonly settingsService: SettingsService,
  ) {}

  async create(createAppointmentDto: CreateAppointmentDto, patientId: string): Promise<Appointment> {
    const { doctorId, appointmentDate, appointmentTime, notes, receptionistId } = createAppointmentDto;

    const doctor = await this.usersService.findOne(doctorId);
    if (doctor.role !== UserRole.DOCTOR) {
      throw new BadRequestException("Selected user is not a doctor");
    }

    if (!doctor.isActive) {
      throw new BadRequestException("Doctor is not active");
    }

    // Check doctor availability
    const settings = await this.settingsService.getSettings(doctorId).catch(() => null);
    const availableDays = settings?.availableDays || doctor.availableDays || [];
    const appointmentDateObj = new Date(appointmentDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const appointmentDay = dayNames[appointmentDateObj.getDay()];

    if (!availableDays.includes(appointmentDay)) {
      throw new BadRequestException(`Doctor is not available on ${appointmentDay}`);
    }

    // Check time slot availability
    if (settings?.startTime && settings?.endTime) {
      const [startHour, startMin] = settings.startTime.split(':').map(Number);
      const [endHour, endMin] = settings.endTime.split(':').map(Number);
      const [apptHour, apptMin] = appointmentTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const apptMinutes = apptHour * 60 + apptMin;

      if (apptMinutes < startMinutes || apptMinutes >= endMinutes) {
        throw new BadRequestException(`Doctor is only available between ${settings.startTime} and ${settings.endTime}`);
      }
    }

    // Check for existing appointment at same time
    const existingAppointment = await this.appointmentsRepository.findOne({
      where: {
        doctorId,
        appointmentDate,
        appointmentTime,
        status: AppointmentStatus.CONFIRMED,
      },
    });

    if (existingAppointment) {
      throw new BadRequestException("This time slot is already booked. Please choose another time.");
    }

    // Check for pending appointment at same time
    const pendingAppointment = await this.appointmentsRepository.findOne({
      where: {
        doctorId,
        appointmentDate,
        appointmentTime,
        status: AppointmentStatus.PENDING,
      },
    });

    if (pendingAppointment) {
      throw new BadRequestException("This time slot has a pending appointment. Please choose another time.");
    }

    const appointment = this.appointmentsRepository.create({
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      notes,
      status: AppointmentStatus.PENDING,
      receptionistId: receptionistId ?? null,
      arrived: false,
      paymentStatus: PaymentStatus.NOT_PAID,
    });

    return this.appointmentsRepository.save(appointment);
  }

  async findAll(): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      relations: ["patient", "doctor", 'receptionist'],
      order: { appointmentDate: "DESC", appointmentTime: "DESC" },
    });
  }

  async findByPatient(patientId: string): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: { patientId },
      relations: ["doctor", 'receptionist'],
      order: { appointmentDate: "DESC", appointmentTime: "DESC" },
    });
  }

  async findByDoctor(doctorId: string): Promise<Appointment[]> {
    return this.appointmentsRepository.find({
      where: { doctorId },
      relations: ["patient", 'receptionist'],
      order: { appointmentDate: "DESC", appointmentTime: "DESC" },
    });
  }

  async getPendingCount(doctorId: string): Promise<{ count: number }> {
    const count = await this.appointmentsRepository.count({
      where: {
        doctorId,
        status: AppointmentStatus.PENDING,
      },
    });
    return { count };
  }

  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: ["patient", "doctor", 'receptionist'],
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto, user: User): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (user.role === UserRole.PATIENT && appointment.patientId !== user.id) {
      throw new ForbiddenException("You can only update your own appointments");
    }

    if (user.role === UserRole.DOCTOR && appointment.doctorId !== user.id) {
      throw new ForbiddenException("You can only update appointments assigned to you");
    }

    // Receptionists can update many appointment fields
    if (user.role === UserRole.RECEPTIONIST) {
      // allow receptionist updates — but we might restrict in future
    }

    if (updateAppointmentDto.appointmentDate || updateAppointmentDto.appointmentTime) {
      const newDate = updateAppointmentDto.appointmentDate || appointment.appointmentDate;
      const newTime = updateAppointmentDto.appointmentTime || appointment.appointmentTime;

      const conflictingAppointment = await this.appointmentsRepository.findOne({
        where: {
          doctorId: appointment.doctorId,
          appointmentDate: newDate,
          appointmentTime: newTime,
          status: AppointmentStatus.CONFIRMED,
        },
      });

      if (conflictingAppointment && conflictingAppointment.id !== id) {
        throw new BadRequestException("This time slot is already booked");
      }
    }

    Object.assign(appointment, updateAppointmentDto);
    return this.appointmentsRepository.save(appointment);
  }

  async cancel(id: string, user: User): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (user.role === UserRole.PATIENT && appointment.patientId !== user.id) {
      throw new ForbiddenException("You can only cancel your own appointments");
    }

    if (user.role === UserRole.DOCTOR && appointment.doctorId !== user.id) {
      throw new ForbiddenException("You can only cancel appointments assigned to you");
    }

    if (user.role === UserRole.RECEPTIONIST) {
      // Receptionist can cancel appointments
    }

    appointment.status = AppointmentStatus.CANCELLED;
    return this.appointmentsRepository.save(appointment);
  }

  async remove(id: string): Promise<void> {
    const result = await this.appointmentsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }
  }
}
