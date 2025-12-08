import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorSchedule } from './schedule.entity';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorSchedule])],
  providers: [SchedulesService],
  controllers: [SchedulesController],
  exports: [SchedulesService], // <-- ensure service is exported
})
export class SchedulesModule {}