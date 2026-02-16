import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, LessThan } from "typeorm";
import { Appointment } from "./entities/appointment.entity";
import { AppointmentStatus, UserRole, PaymentStatus } from '../common/index'
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { UsersService } from "../users/users.service";
import { User } from "../users/entities/user.entity";
import { SettingsService } from "../settings/settings.service";
import { SchedulesService } from '../schedules/schedules.service';
import { NotificationIntegrationService } from '../notifications/notification-integration.service';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    private readonly usersService: UsersService,
    private readonly settingsService: SettingsService,
    private readonly schedulesService: SchedulesService,
    private readonly notificationIntegrationService: NotificationIntegrationService,
  ) { }

  async create(
    createAppointmentDto: CreateAppointmentDto,
    patientId: string,
    createdByRole?: UserRole,
  ): Promise<Appointment> {
    const { doctorId, appointmentDate, appointmentTime, notes, receptionistId } = createAppointmentDto;

    // Auto-assign a free doctor if none was provided
    let assignedDoctorId = doctorId;
    if (!assignedDoctorId) {
      const autoDoctor = await this.pickAvailableDoctor(appointmentDate, appointmentTime);
      if (!autoDoctor) {
        throw new BadRequestException('No available doctors for the requested date/time');
      }
      assignedDoctorId = autoDoctor.id;
    }

    const doctor = await this.usersService.findOne(assignedDoctorId);
    if (doctor.role !== UserRole.DOCTOR) {
      throw new BadRequestException("Selected user is not a doctor");
    }

    if (!doctor.isActive) {
      throw new BadRequestException("Doctor is not active");
    }
    const settings = await this.settingsService.getSettings(assignedDoctorId).catch(() => null);
    const availableDays = settings?.availableDays || doctor.availableDays || [];
    const appointmentDateObj = new Date(appointmentDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const appointmentDay = dayNames[appointmentDateObj.getDay()];
    // Normalize to accept both full and short day names, case-insensitive
    const toLower = (v: any) => String(v ?? '').toLowerCase();
    const normalized = (availableDays || []).map(toLower);
    const shortMap: Record<string, string> = {
      sunday: 'sun', monday: 'mon', tuesday: 'tue', wednesday: 'wed', thursday: 'thu', friday: 'fri', saturday: 'sat'
    };
    const dayLower = toLower(appointmentDay);
    const isAllowed = normalized.includes(dayLower) || normalized.includes(shortMap[dayLower]);

    if (!isAllowed) {
      throw new BadRequestException(`Doctor is not available on ${appointmentDay}`);
    }

    const dateStr = this.toDateString(appointmentDate);
    const timeStr = this.toTimeString(appointmentTime);
    const now = new Date();
    const isToday = dateStr === this.toDateString(now);

    // Prevent booking past times for today (already checked above? Let's keep it safe)
    const [apptHour, apptMin] = timeStr.split(':').map(Number);
    const apptTotalMins = apptHour * 60 + apptMin;
    if (isToday) {
      const currentTotalMins = now.getHours() * 60 + now.getMinutes();
      if (apptTotalMins < currentTotalMins) {
        throw new BadRequestException("Cannot book an appointment for a time that has already passed today.");
      }
    }

    // Conflict Check
    const conflictStatuses = [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING];
    const conflictingAppointment = await this.appointmentsRepository.findOne({
      where: {
        doctorId: assignedDoctorId,
        appointmentDate: dateStr as any,
        appointmentTime: timeStr,
        status: In(conflictStatuses) as any,
      },
    });

    if (conflictingAppointment) {
      const msg = conflictingAppointment.status === AppointmentStatus.CONFIRMED
        ? "This time slot is already booked."
        : "This time slot has a pending appointment.";
      throw new BadRequestException(`${msg} Please choose another time.`);
    }

    try {
      const day = await this.schedulesService.getDaySchedule(assignedDoctorId, dateStr);
      const slot = (day?.slots || []).find((s: any) => {
        const start = this.toTimeString(s.startTime || s.time);
        const end = this.toTimeString(s.endTime) || start;
        return this.timeWithinSlot(timeStr, start, end);
      });

      if (!slot) {
        // Fallback: If no explicit slot is found, check global settings
        const settings = await this.settingsService.getSettings(assignedDoctorId).catch(() => null);
        if (settings) {
          const availableDays = settings.availableDays || doctor.availableDays || [];
          const appointmentDateObj = new Date(appointmentDate);
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const appointmentDay = dayNames[appointmentDateObj.getDay()];
          const normalizedDays = (availableDays || []).map((d: string) => d.toLowerCase());
          const dayLower = appointmentDay.toLowerCase();
          const shortMap: Record<string, string> = {
            sunday: 'sun', monday: 'mon', tuesday: 'tue', wednesday: 'wed',
            thursday: 'thu', friday: 'fri', saturday: 'sat'
          };

          if (!normalizedDays.includes(dayLower) && !normalizedDays.includes(shortMap[dayLower])) {
            throw new BadRequestException(`Doctor is not available on ${appointmentDay}`);
          }

          // Check if time is within fallback working hours
          if (settings.startTime && settings.endTime) {
            const [startHour, startMin] = settings.startTime.split(':').map(Number);
            const [endHour, endMin] = settings.endTime.split(':').map(Number);
            const [apptHour, apptMin] = timeStr.split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            const apptMinutes = apptHour * 60 + apptMin;

            if (apptMinutes < startMinutes || apptMinutes >= endMinutes) {
              throw new BadRequestException(`Doctor is only available between ${settings.startTime} and ${settings.endTime}`);
            }
          }
        } else {
          // No settings AND no slot -> reject to be safe
          throw new BadRequestException("This time slot is not available in the doctor's schedule.");
        }
      } else if (slot && (slot.status === 'blocked' || slot.status === 'booked')) {
        throw new BadRequestException('Selected slot is not available. Please pick another time.');
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      console.warn('Schedule lookup failed during appointment creation', err);
    }

    const defaultStatus = createAppointmentDto.status
      ? createAppointmentDto.status
      : (createdByRole === UserRole.RECEPTIONIST || createdByRole === UserRole.ADMIN
        ? AppointmentStatus.CONFIRMED
        : AppointmentStatus.PENDING);

    const paymentStatus = (createdByRole === UserRole.RECEPTIONIST || createdByRole === UserRole.ADMIN)
      ? PaymentStatus.NOT_PAID
      : PaymentStatus.PENDING;


    const appointment = this.appointmentsRepository.create({
      patientId,
      doctorId: assignedDoctorId,
      appointmentDate,
      appointmentTime,
      notes,
      status: defaultStatus,
      receptionistId: receptionistId ?? null,
      arrived: false,
      paymentStatus,
    });

    const savedAppointment = await this.appointmentsRepository.save(appointment);

    // Mark the slot as booked in the schedule
    try {
      const dateStr = this.toDateString(savedAppointment.appointmentDate);
      const timeStr = this.toTimeString(savedAppointment.appointmentTime);
      // Use setSlotStatus to mark the slot as booked and link it to the appointment
      await this.schedulesService.setSlotStatus(
        String(savedAppointment.doctorId),
        dateStr,
        timeStr,
        'booked',
        undefined,
        savedAppointment.id
      );
    } catch (e) {
      console.error('Failed to mark schedule slot booked', e);
      // Don't fail appointment creation if schedule update fails
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
    try {
      return await this.appointmentsRepository.find({
        where: { patientId },
        relations: ["doctor", "receptionist"],
        order: { appointmentDate: "DESC", appointmentTime: "DESC" },
      });
    } catch (error) {
      this.logger.error('Failed to load patient appointments with relations', error as any);
      return this.appointmentsRepository.find({
        where: { patientId },
        order: { appointmentDate: "DESC", appointmentTime: "DESC" },
      });
    }
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

    // Fetch related medical records
    const medicalRecordsService = (this as any).medicalRecordsService;
    const prescriptionsService = (this as any).prescriptionsService;
    const consultationsService = (this as any).consultationsService;

    let medicalRecords = [];
    let prescriptions = [];
    let consultation = null;

    if (medicalRecordsService && typeof medicalRecordsService.findByAppointment === 'function') {
      medicalRecords = await medicalRecordsService.findByAppointment(id);
    }
    if (prescriptionsService && typeof prescriptionsService.findByAppointment === 'function') {
      prescriptions = await prescriptionsService.findByAppointment(id, appointment.doctorId);
    }
    if (consultationsService && typeof consultationsService.findByAppointmentId === 'function') {
      consultation = await consultationsService.findByAppointmentId(id);
    }

    return {
      ...appointment,
      medicalRecords,
      prescriptions,
      consultation,
    };
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

    // Security Hardening: Prevent patients from self-confirming or marking as paid
    if (user.role === UserRole.PATIENT) {
      delete updateAppointmentDto.status;
      delete updateAppointmentDto.paymentStatus;
      delete updateAppointmentDto.receptionistId;
      delete updateAppointmentDto.arrived;
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

    // Detect reschedule before we mutate
    const newDateStr = this.toDateString(updateAppointmentDto.appointmentDate || appointment.appointmentDate);
    const newTimeStr = this.toTimeString(updateAppointmentDto.appointmentTime || appointment.appointmentTime);
    const oldDateStr = this.toDateString(originalDate);
    const oldTimeStr = this.toTimeString(originalTime);

    Object.assign(appointment, updateAppointmentDto);
    const updatedAppointment = await this.appointmentsRepository.save(appointment);

    const dateChanged = newDateStr !== oldDateStr;
    const timeChanged = newTimeStr !== oldTimeStr;

    if (dateChanged || timeChanged) {
      // Free old slot and book new slot
      try {
        await this.schedulesService.setSlotStatus(String(updatedAppointment.doctorId), oldDateStr, oldTimeStr, 'available');
        await this.schedulesService.setSlotStatus(String(updatedAppointment.doctorId), newDateStr, newTimeStr, 'booked');
      } catch (e) {
        // non-fatal
        console.error('Failed to update schedule during reschedule', e);
      }

      await this.notificationIntegrationService.createAppointmentNotification(
        updatedAppointment,
        'rescheduled',
        appointment.patient,
        appointment.doctor,
      );
    }

    return updatedAppointment;
  }


  async confirm(id: string, user: User): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (user.role === UserRole.PATIENT) {
      throw new ForbiddenException("Patients cannot confirm appointments");
    }

    if (user.role === UserRole.DOCTOR && appointment.doctorId !== user.id) {
      throw new ForbiddenException("You can only confirm appointments assigned to you");
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException("Cannot confirm a cancelled appointment");
    }

    appointment.status = AppointmentStatus.CONFIRMED;
    const confirmedAppointment = await this.appointmentsRepository.save(appointment);

    try {
      await this.notificationIntegrationService.createAppointmentNotification(
        confirmedAppointment,
        'confirmed' as any, // Cast as any if 'confirmed' is not explicitly listed in type union yet
        appointment.patient,
        appointment.doctor,
      );
    } catch (e) {
      this.logger.error('Failed to send confirmation notification', e);
    }

    return confirmedAppointment;
  }

  async cancel(id: string, user: User): Promise<Appointment> {
    const appointment = await this.findOne(id);

    if (user.role === UserRole.PATIENT) {
      if (appointment.patientId !== user.id) {
        throw new ForbiddenException("You can only cancel your own appointments");
      }
      // "Patient (before confirmation)"
      if (appointment.status !== AppointmentStatus.PENDING) {
        throw new ForbiddenException("You can only cancel pending appointments");
      }
    }

    if (user.role === UserRole.DOCTOR && appointment.doctorId !== user.id) {
      throw new ForbiddenException("You can only cancel appointments assigned to you");
    }

    if (user.role === UserRole.RECEPTIONIST) {
      // Receptionist can cancel appointments
    }

    // If already completed, we might later add logic
    // to tear down any associated resources (video room, etc.)
    if (appointment.status === AppointmentStatus.COMPLETED) {
      // TODO: Add logic to destroy video call/chat room
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

  async markMissedAndOverdueAppointments() {
    const now = new Date();
    const todayStr = this.toDateString(now);
    const timeStr = this.toTimeString(now);

    this.logger.debug(`Checking appointments before ${todayStr} ${timeStr}`);

    // Find appointments that should be marked as missed or overdue
    // Logic: Date is before today OR (Date is today AND time is before current time)
    // AND status is PENDING or CONFIRMED
    const overdueAppointments = await this.appointmentsRepository.find({
      where: [
        {
          appointmentDate: LessThan(todayStr as any),
          status: In([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.SCHEDULED] as any),
        },
        {
          appointmentDate: todayStr as any,
          appointmentTime: LessThan(timeStr),
          status: In([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.SCHEDULED] as any),
        },
      ],
      relations: ['doctor', 'patient'],
    });

    if (overdueAppointments.length === 0) {
      return;
    }

    this.logger.log(`Found ${overdueAppointments.length} overdue appointments to update`);

    for (const appt of overdueAppointments) {
      let notificationType: 'overdue' | 'missed' = 'overdue';
      if (appt.status === AppointmentStatus.PENDING) {
        appt.status = AppointmentStatus.MISSED;
        notificationType = 'missed';
      } else {
        appt.status = AppointmentStatus.OVERDUE;
        notificationType = 'overdue';
      }

      await this.appointmentsRepository.save(appt);

      // Notify doctor
      if (appt.doctor) {
        await this.notificationIntegrationService.createAppointmentNotification(
          appt,
          notificationType,
          appt.patient,
          appt.doctor,
        );
      }
    }
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

  private timeWithinSlot(time: string, start: string, end: string): boolean {
    if (!time || !start) return false;
    const toMinutes = (val: string) => {
      const [h, m] = val.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const t = toMinutes(time);
    const s = toMinutes(start);
    const e = end ? toMinutes(end) : s;
    if (e === s) return t === s;
    return t >= s && t < e;
  }

  // Auto-select an available doctor for the given date/time
  private async pickAvailableDoctor(date: string | Date, time: string): Promise<User | null> {
    const dateStr = this.toDateString(date);
    const timeStr = this.toTimeString(time);

    const doctors = await this.usersService.findDoctors();
    if (!doctors || doctors.length === 0) return null;

    // Simple strategy: first doctor with an available slot and no pending/confirmed appointment at that time
    for (const doc of doctors) {
      if (!doc.isActive) continue;

      const settings = await this.settingsService.getSettings(doc.id).catch(() => null);
      const availableDays = settings?.availableDays || doc.availableDays || [];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const appointmentDay = dayNames[new Date(dateStr).getDay()];
      if (!availableDays.includes(appointmentDay)) continue;

      // Check working hours window if known
      const startTime = settings?.startTime || doc.startTime;
      const endTime = settings?.endTime || doc.endTime;
      if (startTime && endTime) {
        const [sh, sm] = String(startTime).slice(0, 5).split(':').map(Number);
        const [eh, em] = String(endTime).slice(0, 5).split(':').map(Number);
        const [ah, am] = String(timeStr).slice(0, 5).split(':').map(Number);
        const sMin = (sh || 0) * 60 + (sm || 0);
        const eMin = (eh || 0) * 60 + (em || 0);
        const aMin = (ah || 0) * 60 + (am || 0);
        if (aMin < sMin || aMin >= eMin) continue;
      }

      // Check for existing pending/confirmed appointment
      const conflict = await this.appointmentsRepository.findOne({
        where: {
          doctorId: doc.id,
          appointmentDate: dateStr,
          appointmentTime: timeStr,
          status: In([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]) as any,
        } as any,
      });
      if (conflict) continue;

      // Check schedule slot status is available (not blocked/booked)
      try {
        const day = await this.schedulesService.getDaySchedule(doc.id, dateStr);
        const slot = (day?.slots || []).find((s: any) => (s.startTime || s.time) === timeStr);
        if (slot && slot.status === 'blocked') {
          continue;
        }
      } catch (_) {
        // If schedule fails, still allow based on appointments + working hours
      }

      return doc as any;
    }

    return null;
  }
}
