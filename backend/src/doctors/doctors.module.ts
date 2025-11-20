import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { DoctorsController } from "./doctors.controller"
import { DoctorsService } from "./doctors.service"
import { User } from "../users/entities/user.entity"
import { EmailModule } from "../common/services/email.module"

@Module({
  imports: [TypeOrmModule.forFeature([User]), EmailModule],
  controllers: [DoctorsController],

  providers: [DoctorsService],
  exports: [DoctorsService],
})

export class DoctorsModule {}
