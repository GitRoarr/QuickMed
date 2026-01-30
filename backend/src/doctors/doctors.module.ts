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
import { Conversation } from "../messages/entities/conversation.entity"
import { Message } from "../messages/entities/message.entity"
import { DoctorSettings } from "../settings/entities/doctor-settings.entity"
import { Prescription } from "../prescriptions/entities/prescription.entity"
import { MedicalRecord } from "../medical-records/entities/medical-record.entity"
import { Consultation } from "../consultations/entities/consultation.entity"
import { AvailabilityTemplate } from "../schedules/entities/availability-template.entity"
import { BreakConfig } from "../schedules/entities/break-config.entity"
import { DoctorAnalytics } from "../schedules/entities/doctor-analytics.entity"
import { DoctorSchedule } from "../schedules/schedule.entity"
import { Review } from "../reviews/entities/review.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Appointment,
      Payment,
      Conversation,
      Message,
      DoctorSettings,
      Prescription,
      MedicalRecord,
      Consultation,
      AvailabilityTemplate,
      BreakConfig,
      DoctorAnalytics,
      DoctorSchedule,
      Review,
    ]),
    EmailModule,
    ReviewsModule,
    MessagesModule,
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
