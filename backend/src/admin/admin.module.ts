import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AdminStatsService } from './admin.stats.service';
import { DoctorsService } from '../doctors/doctors.service';
import { EmailModule } from '@/common/services/email.module';
import { SmsModule } from '@/common/services/sms.module';
import { Theme } from './entities/theme.entity';
import { ThemeService } from './theme.service';
import { ReceptionistModule } from '../receptionist/receptionist.module';
import { forwardRef } from '@nestjs/common';


@Module({
  imports: [TypeOrmModule.forFeature([User, Appointment, Theme]), EmailModule, SmsModule, forwardRef(() => ReceptionistModule)],
  controllers: [AdminController],
  providers: [AdminService, AdminStatsService, DoctorsService, ThemeService],
  exports: [AdminService, ThemeService],
})
export class AdminModule {}


