import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';

import { Payment } from '../payments/entities/payment.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([User, Appointment, Theme, Payment]),
    EmailModule,
    SmsModule,
    ReviewsModule,
    forwardRef(() => ReceptionistModule),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminStatsService, DoctorsService, ThemeService],
  exports: [AdminService, ThemeService],
})
export class AdminModule {}


