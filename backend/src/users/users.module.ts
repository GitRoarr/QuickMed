import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { User } from "./entities/user.entity";
import { CloudinaryModule } from "@/profile/cloudinary.module";
import { ReviewsModule } from "../reviews/reviews.module";
import { SettingsModule } from "../settings/settings.module";
import { DoctorSchedule } from "@/schedules/schedule.entity";
import { DoctorsModule } from "../doctors/doctors.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DoctorSchedule]),
    CloudinaryModule,
    forwardRef(() => ReviewsModule),
    forwardRef(() => SettingsModule),
    forwardRef(() => DoctorsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
