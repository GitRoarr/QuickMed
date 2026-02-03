import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceptionistController } from './receptionist.controller';
import { ReceptionistService } from './receptionist.service';
import { Appointment } from '../appointments/entities/appointment.entity';
import { User } from '../users/entities/user.entity';
import { Message } from '../messages/entities/message.entity';
import { ReceptionistMessage } from './entities/receptionist-message.entity';
import { EmailModule } from '@/common/services/email.module';
import { SmsModule } from '@/common/services/sms.module';
import { CloudinaryModule } from '@/profile/cloudinary.module';
import { AdminModule } from '../admin/admin.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, User, Message, ReceptionistMessage]), 
    EmailModule, 
    SmsModule, 
    CloudinaryModule,
    forwardRef(() => AdminModule),
    AppointmentsModule,
    UsersModule,
  ],
  controllers: [ReceptionistController],
  providers: [ReceptionistService],
  exports: [ReceptionistService],
})
export class ReceptionistModule {}
