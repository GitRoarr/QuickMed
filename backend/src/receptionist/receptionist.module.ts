import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceptionistController } from './receptionist.controller';
import { ReceptionistService } from './receptionist.service';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { UsersService } from '../users/users.service';
import { EmailModule } from '@/common/services/email.module';
import { SmsModule } from '@/common/services/sms.module';
import { CloudinaryModule } from '@/profile/cloudinary.module';
import { forwardRef } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, User]), 
    EmailModule, 
    SmsModule, 
    CloudinaryModule,
    forwardRef(() => AdminModule)
  ],
  controllers: [ReceptionistController],
  providers: [ReceptionistService, AppointmentsService, UsersService],
  exports: [ReceptionistService],
})
export class ReceptionistModule {}
