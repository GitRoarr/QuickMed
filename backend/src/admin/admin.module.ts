import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Theme } from './entities/theme.entity';
import { EmailModule } from '../common/services/email.module';
import { SmsModule } from '../common/services/sms.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { forwardRef } from '@nestjs/common';
import { ReceptionistModule } from '../receptionist/receptionist.module';
import { ConsultationsModule } from '../consultations/consultations.module';
import { AdminStatsService } from './admin.stats.service';
import { DoctorsModule } from '../doctors/doctors.module';
import { ThemeService } from './theme.service';
import { MessagesModule } from '@/messages/messages.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([User, Appointment, Theme, Payment]),
    EmailModule,
    SmsModule,
    ReviewsModule,
    MessagesModule,
    ConsultationsModule,
    DoctorsModule,

    forwardRef(() => ReceptionistModule),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminStatsService, ThemeService],
  exports: [AdminService, ThemeService],
})
export class AdminModule { }


