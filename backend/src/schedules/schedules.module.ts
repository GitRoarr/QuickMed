import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorSchedule } from './schedule.entity';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { Appointment } from '../appointments/entities/appointment.entity';
import { SettingsModule } from '../settings/settings.module';
import { AvailabilityTemplate } from './entities/availability-template.entity';
import { BreakConfig } from './entities/break-config.entity';
import { DoctorAnalytics } from './entities/doctor-analytics.entity';
import { AvailabilityTemplateService } from './availability-template.service';
import { DoctorAnalyticsService } from './doctor-analytics.service';
import { ConflictDetectionService } from './conflict-detection.service';
import { AvailabilityTemplateController } from './availability-template.controller';
import { DoctorAnalyticsController } from './doctor-analytics.controller';
import { AutoScheduleInitializerService } from './auto-schedule-initializer.service';
import { DoctorSettings } from '../settings/entities/doctor-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DoctorSchedule,
      Appointment,
      AvailabilityTemplate,
      BreakConfig,
      DoctorAnalytics,
      DoctorSettings,
    ]),
    SettingsModule,
  ],
  providers: [
    SchedulesService,
    AvailabilityTemplateService,
    DoctorAnalyticsService,
    ConflictDetectionService,
    AutoScheduleInitializerService,
  ],
  controllers: [
    SchedulesController,
    AvailabilityTemplateController,
    DoctorAnalyticsController,
  ],
  exports: [
    SchedulesService,
    AvailabilityTemplateService,
    DoctorAnalyticsService,
    ConflictDetectionService,
    AutoScheduleInitializerService,
  ],
})
export class SchedulesModule { }