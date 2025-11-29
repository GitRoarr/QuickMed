import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { ChapaService } from './chapa.service';
import { Payment } from './entities/payment.entity';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    AppointmentsModule,
  ],
  controllers: [PaymentsController],
  providers: [ChapaService],
  exports: [ChapaService],
})
export class PaymentsModule {}
