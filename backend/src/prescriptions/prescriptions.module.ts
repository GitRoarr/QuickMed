import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { Prescription } from './entities/prescription.entity';
import { User } from '../users/entities/user.entity';
import { MedicalRecordsModule } from '../medical-records/medical-records.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prescription, User]),
    MedicalRecordsModule
  ],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule { }
