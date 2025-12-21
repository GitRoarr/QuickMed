import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';
import { CashService } from './cash.service';
import { Payment } from './entities/payment.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Appointment]),
    AppointmentsModule,
  ],
  controllers: [PaymentsController],
  providers: [StripeService, CashService],
  exports: [StripeService, CashService],
})
export class PaymentsModule {}
