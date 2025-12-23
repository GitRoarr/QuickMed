import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Appointment} from "./entities/appointment.entity";
import {AppointmentStatus,UserRole,PaymentStatus} from '../common/index'
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { UsersService } from "../users/users.service";
import { User} from "../users/entities/user.entity";
import { SettingsService } from "../settings/settings.service";
import { SchedulesService } from '../schedules/schedules.service';
import { NotificationIntegrationService } from '../notifications/notification-integration.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    private readonly usersService: UsersService,
    private readonly settingsService: SettingsService,
    private readonly schedulesService: SchedulesService,
    private readonly notificationIntegrationService: NotificationIntegrationService,
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
    const settings = await this.settingsService.getSettings(doctorId).catch(() => null);
    const availableDays = settings?.availableDays || doctor.availableDays || [];
    const appointmentDateObj = new Date(appointmentDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const appointmentDay = dayNames[appointmentDateObj.getDay()];

    if (!availableDays.includes(appointmentDay)) {
      throw new BadRequestException(`Doctor is not available on ${appointmentDay}`);
    }

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

    const savedAppointment = await this.appointmentsRepository.save(appointment);

    try {
      const dateStr = this.toDateString(savedAppointment.appointmentDate);
      const timeStr = this.toTimeString(savedAppointment.appointmentTime);
      await this.schedulesService.setSlotStatus(
        String(savedAppointment.doctorId),
        dateStr,
        timeStr,
        'booked'
      );
    } catch (e) {
      console.error('Failed to mark schedule slot booked', e);
    }

    const patient = await this.usersService.findOne(patientId);
    await this.notificationIntegrationService.createAppointmentNotification(
      { ...savedAppointment, patient, doctor } as Appointment,
      'created',
      patient,
      doctor,
    );

    return savedAppointment;
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

    const originalDate = appointment.appointmentDate;
    const originalTime = appointment.appointmentTime;

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
    const updatedAppointment = await this.appointmentsRepository.save(appointment);

    const dateChanged = !!updateAppointmentDto.appointmentDate && this.toDateString(updateAppointmentDto.appointmentDate) !== this.toDateString(originalDate);
    const timeChanged = !!updateAppointmentDto.appointmentTime && this.toTimeString(updateAppointmentDto.appointmentTime) !== this.toTimeString(originalTime);

    if (dateChanged || timeChanged) {
      await this.notificationIntegrationService.createAppointmentNotification(
        updatedAppointment,
        'rescheduled',
        appointment.patient,
        appointment.doctor,
      );
    }

    return updatedAppointment;
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

    const canceledAppointment = await this.appointmentsRepository.save(appointment);

    await this.notificationIntegrationService.createAppointmentNotification(
      canceledAppointment,
      'cancelled',
      appointment.patient,
      appointment.doctor,
    );

    const apt = await this.appointmentsRepository.findOne({ where: { id } });
    if (apt) {
      const cancelDate = this.toDateString(apt.appointmentDate);
      const cancelTime = this.toTimeString(apt.appointmentTime);
      await this.schedulesService.setSlotStatus(
        String(apt.doctorId),
        cancelDate,
        cancelTime,
        'available'
      );
    }

    return canceledAppointment;
  }

  async remove(id: string): Promise<void> {
    const result = await this.appointmentsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }
  }

  async getPendingCountForDoctor(doctorId: string): Promise<number> {
    if (!doctorId) return 0;
    return this.appointmentsRepository.count({
      where: { doctorId: doctorId, status: 'pending' as any }
    });
  }

  // helper inside the class (add near other private helpers)
  private toDateString(d: any): string {
    if (!d) return '';
    return d instanceof Date ? d.toISOString().split('T')[0] : String(d);
  }

  private toTimeString(t: any): string {
    if (!t) return '';
    if (t instanceof Date) return t.toTimeString().slice(0, 5);
    return String(t).slice(0, 5);
  }
}
