import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { DoctorsController } from "./doctors.controller"
import { DoctorsService } from "./doctors.service"
import { User } from "../users/entities/user.entity"
import { Appointment } from "../appointments/entities/appointment.entity"
import { EmailModule } from "../common/services/email.module"
import { ReviewsModule } from "../reviews/reviews.module"
import { Payment } from "../payments/entities/payment.entity"
import { MessagesModule } from "../messages/messages.module"

@Module({
  imports: [TypeOrmModule.forFeature([User, Appointment, Payment]), EmailModule, ReviewsModule, MessagesModule],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
