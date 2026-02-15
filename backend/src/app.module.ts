import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { join } from "path";

import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { DoctorsModule } from "./doctors/doctors.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AdminModule } from "./admin/admin.module";
import { MedicalRecordsModule } from "./medical-records/medical-records.module";
import { ReceptionistModule } from "./receptionist/receptionist.module";
import { PaymentsModule } from "./payments/payments.module";
import { PrescriptionsModule } from "./prescriptions/prescriptions.module";
import { MessagesModule } from "./messages/messages.module";
import { SettingsModule } from "./settings/settings.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { PatientPortalModule } from "./patient-portal/patient-portal.module";
import { SchedulesModule } from "./schedules/schedules.module";
import { ConsultationsModule } from "./consultations/consultations.module";
import { WebRtcModule } from "./webrtc/webrtc.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, "..", ".env"),
        join(__dirname, "..", "..", ".env"),
        ".env",
      ],
    }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        url: configService.get<string>("DATABASE_URL"),
        ssl: { rejectUnauthorized: false },
        autoLoadEntities: true,
        synchronize: configService.get("NODE_ENV") !== "production",
        logging: configService.get("NODE_ENV") === "development",
      }),
    }),

    AuthModule,
    UsersModule,
    SchedulesModule,
    DoctorsModule,
    AppointmentsModule,
    NotificationsModule,
    MedicalRecordsModule,
    AdminModule,
    ReceptionistModule,
    PaymentsModule,
    PrescriptionsModule,
    MessagesModule,
    SettingsModule,
    ReviewsModule,
    PatientPortalModule,
    ConsultationsModule,
    WebRtcModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private dataSource: DataSource) { }

  async onModuleInit() {
    try {
      if (this.dataSource.driver.options.type === 'postgres') {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
          // Use plural 'appointments_status_enum' as that's what TypeORM usually generates for Appointment entity table
          await queryRunner.query(`ALTER TYPE "appointments_status_enum" ADD VALUE IF NOT EXISTS 'missed'`);
          await queryRunner.query(`ALTER TYPE "appointments_status_enum" ADD VALUE IF NOT EXISTS 'overdue'`);
        } catch (e) {
          console.warn('Failed to update appointments_status_enum (might already exist or wrong name)', e);
        } finally {
          await queryRunner.release();
        }
      }
    } catch (e) {
      console.error('Error in onModuleInit', e);
    }
  }
}
