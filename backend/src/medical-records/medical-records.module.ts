import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MedicalRecord } from "./entities/medical-record.entity";
import { MedicalRecordsService } from "./medical-records.service";
import { MedicalRecordsController } from "./medical-records.controller";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [TypeOrmModule.forFeature([MedicalRecord]), UsersModule],
  providers: [MedicalRecordsService],
  controllers: [MedicalRecordsController],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
