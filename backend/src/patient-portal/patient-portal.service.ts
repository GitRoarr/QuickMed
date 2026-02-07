import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { MedicalRecord, MedicalRecordType } from '../medical-records/entities/medical-record.entity';
import { Prescription, PrescriptionStatus } from '../prescriptions/entities/prescription.entity';
import { User } from '../users/entities/user.entity';
import { AppointmentStatus } from '../common';

@Injectable()
export class PatientPortalService {
  private readonly logger = new Logger(PatientPortalService.name);
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    @InjectRepository(MedicalRecord)
    private readonly medicalRecordsRepository: Repository<MedicalRecord>,
    @InjectRepository(Prescription)
    private readonly prescriptionsRepository: Repository<Prescription>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getDashboard(patientId: string) {
    const user = await this.usersRepository.findOne({ where: { id: patientId } });
    if (!user) {
      throw new NotFoundException('Patient not found');
    }
    try {
      const appointments = await this.appointmentsRepository.find({
        where: { patientId },
        relations: ['doctor'],
        order: { appointmentDate: 'ASC', appointmentTime: 'ASC' },
      });

      const upcomingAppointments = appointments
        .filter((appointment) => this.isUpcoming(appointment))
        .slice(0, 3)
        .map((appointment) => this.mapAppointment(appointment));

      const prescriptions = await this.prescriptionsRepository.find({
        where: { patientId, status: PrescriptionStatus.ACTIVE },
        relations: ['doctor'],
        order: { prescriptionDate: 'DESC' },
        take: 5,
      });

      const activeMedsCount = await this.prescriptionsRepository.count({
        where: { patientId, status: PrescriptionStatus.ACTIVE },
      });

      const recentLabResults = await this.medicalRecordsRepository.find({
        where: { patientId },
        order: { recordDate: 'DESC' },
        take: 5,
      });

      const totalRecordsCount = await this.medicalRecordsRepository.count({ where: { patientId } });
      const labResultsCount = await this.medicalRecordsRepository.count({
        where: { patientId, type: MedicalRecordType.LAB },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcomingCount = await this.appointmentsRepository.count({
        where: {
          patientId,
          appointmentDate: MoreThanOrEqual(today),
        },
      });

      const stats = {
        totalAppointments: appointments.length,
        confirmed: appointments.filter((apt) => apt.status === AppointmentStatus.CONFIRMED).length,
        videoVisits: appointments.filter((apt) => apt.isVideoConsultation).length,
        inPersonVisits: appointments.filter((apt) => !apt.isVideoConsultation).length,
      };

      return {
        patient: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          avatar: user.avatar,
          patientId: user.patientId,
        },
        vitals: {
          bloodPressure: {
            systolic: user.bloodPressureSystolic ?? null,
            diastolic: user.bloodPressureDiastolic ?? null,
          },
          heartRate: user.heartRate ?? null,
          bmi: user.bmi ?? null,
          lastCheckupDate: user.lastCheckupDate ?? null,
        },
        stats,
        quickStats: {
          upcoming: upcomingCount,
          activeMeds: activeMedsCount,
          records: totalRecordsCount,
          testResults: labResultsCount,
        },
        upcomingAppointments,
        prescriptions: prescriptions.map((prescription) => ({
          id: prescription.id,
          medication: prescription.medication,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          doctor: prescription.doctor
            ? `${prescription.doctor.firstName} ${prescription.doctor.lastName}`
            : 'Assigned doctor',
          status: prescription.status,
          prescriptionDate: prescription.prescriptionDate,
        })),
        labResults: recentLabResults.map((record) => ({
          id: record.id,
          title: record.title,
          type: record.type,
          recordDate: record.recordDate,
          status: record.status ?? (record.type === MedicalRecordType.LAB ? 'available' : 'archived'),
          fileUrl: record.fileUrl,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to load patient dashboard', error as any);
      return {
        patient: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          avatar: user.avatar,
          patientId: user.patientId,
        },
        vitals: {
          bloodPressure: {
            systolic: user.bloodPressureSystolic ?? null,
            diastolic: user.bloodPressureDiastolic ?? null,
          },
          heartRate: user.heartRate ?? null,
          bmi: user.bmi ?? null,
          lastCheckupDate: user.lastCheckupDate ?? null,
        },
        stats: {
          totalAppointments: 0,
          confirmed: 0,
          videoVisits: 0,
          inPersonVisits: 0,
        },
        quickStats: {
          upcoming: 0,
          activeMeds: 0,
          records: 0,
          testResults: 0,
        },
        upcomingAppointments: [],
        prescriptions: [],
        labResults: [],
      };
    }
  }

  private isUpcoming(appointment: Appointment): boolean {
    const today = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    if (appointmentDate > today) {
      return true;
    }
    if (appointmentDate.toDateString() === today.toDateString()) {
      return appointment.appointmentTime >= this.formatTime(today);
    }
    return false;
  }

  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  private mapAppointment(appointment: Appointment) {
    return {
      id: appointment.id,
      doctor: appointment.doctor
        ? `${appointment.doctor.firstName} ${appointment.doctor.lastName}`
        : 'Assigned doctor',
      specialty: appointment.doctor?.specialty,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      location: appointment.location,
      status: appointment.status,
      isVideoConsultation: appointment.isVideoConsultation,
      type: appointment.appointmentType,
    };
  }
}

