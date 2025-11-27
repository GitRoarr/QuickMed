import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { AppointmentStatus, PaymentStatus, UserRole } from '../common/index';

@Injectable()
export class ReceptionistService {
  constructor(
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async getTodayAppointments(filter?: { doctorId?: string; status?: string }) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate()+1);

    const qb = this.appointmentRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.doctor', 'doctor')
      .leftJoinAndSelect('a.receptionist', 'receptionist')
      .where('a.appointmentDate >= :today AND a.appointmentDate < :tomorrow', { today, tomorrow });

    if (filter?.doctorId) qb.andWhere('a.doctorId = :doctorId', { doctorId: filter.doctorId });
    if (filter?.status) qb.andWhere('a.status = :status', { status: filter.status });

    return qb.orderBy('a.appointmentTime', 'ASC').getMany();
  }

  async getPendingPayments() {
    return this.appointmentRepo.find({ where: { paymentStatus: PaymentStatus.NOT_PAID }, relations: ['patient','doctor'] });
  }

  async getWaitingPatients() {
    return this.appointmentRepo.find({ where: { status: AppointmentStatus.WAITING }, relations: ['patient','doctor'] });
  }
}
