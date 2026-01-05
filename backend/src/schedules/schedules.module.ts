import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorSchedule } from './schedule.entity';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { Appointment } from '../appointments/entities/appointment.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorSchedule, Appointment]), SettingsModule],
  providers: [SchedulesService],
  controllers: [SchedulesController],
  exports: [SchedulesService], 
})
export class SchedulesModule {}