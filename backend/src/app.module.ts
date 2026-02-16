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
import { LandingModule } from "./landing/landing.module";
import { DoctorsService } from "./doctors/doctors.service";
import { User } from "./users/entities/user.entity";

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
    LandingModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private dataSource: DataSource,
    private doctorsService: DoctorsService
  ) { }

  async onModuleInit() {
    // 1. One-time test invite for Ava Wilson
    try {
      const avaEmail = "ava.wilson@quickmed.com";
      const userRepo = this.dataSource.getRepository(User);
      const existing = await userRepo.findOne({ where: { email: avaEmail } });

      if (!existing) {
        console.log("\n[Init] Generating invitation for Ava Wilson...");
        await this.doctorsService.createDoctorInvite({
          firstName: "Ava",
          lastName: "Wilson",
          email: avaEmail,
          specialty: "Cardiology",
          licenseNumber: "MED-123456",
          phoneNumber: "+1 555-0123",
          bio: "Specialist in cardiovascular health with over 10 years of experience."
        });
      }
    } catch (e) {
      console.warn('Failed to generate test invite for Ava Wilson', e);
    }

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
