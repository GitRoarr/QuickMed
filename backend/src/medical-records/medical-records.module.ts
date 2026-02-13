import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MedicalRecord } from "./entities/medical-record.entity";
import { MedicalRecordsService } from "./medical-records.service";
import { MedicalRecordsController } from "./medical-records.controller";
import { UsersModule } from "../users/users.module";

import { CloudinaryModule } from "../profile/cloudinary.module";

@Module({
  imports: [TypeOrmModule.forFeature([MedicalRecord]), UsersModule, CloudinaryModule],
  providers: [MedicalRecordsService],
  controllers: [MedicalRecordsController],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule { }
