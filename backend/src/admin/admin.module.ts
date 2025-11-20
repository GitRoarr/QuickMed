import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AdminStatsService } from './admin.stats.service';
import { DoctorsService } from '../doctors/doctors.service';
import { EmailModule } from '@/common/services/email.module';


@Module({
  imports: [TypeOrmModule.forFeature([User, Appointment]), EmailModule],
  controllers: [AdminController],
  providers: [AdminService, AdminStatsService, DoctorsService],
  exports: [AdminService],
})
export class AdminModule {}


