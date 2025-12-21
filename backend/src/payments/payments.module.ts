import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';
import { Payment } from './entities/payment.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Appointment]),
    AppointmentsModule,
  ],
  controllers: [PaymentsController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentsModule {}
