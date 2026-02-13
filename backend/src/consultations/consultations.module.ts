import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { Consultation } from './entities/consultation.entity';
import { Treatment } from './entities/treatment.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentsModule } from '../appointments/appointments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { MedicalRecordsModule } from '../medical-records/medical-records.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Consultation, Treatment, Appointment]),
    AppointmentsModule,
    NotificationsModule,
    PrescriptionsModule,
    MedicalRecordsModule,
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule { }
