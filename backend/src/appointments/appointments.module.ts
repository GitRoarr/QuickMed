import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsService } from "./appointments.service";
import { Appointment } from "./entities/appointment.entity";
import { UsersModule } from "../users/users.module";
import { SettingsModule } from "../settings/settings.module";
import { SchedulesModule } from "../schedules/schedules.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    UsersModule,
    SettingsModule,
    SchedulesModule,
    NotificationsModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
