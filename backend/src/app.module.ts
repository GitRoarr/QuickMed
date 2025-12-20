import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { DoctorsModule } from "./doctors/doctors.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AdminModule } from "./admin/admin.module";
import { MedicalRecordsModule } from "./medical-records/medical-records.module";
import { ReceptionistModule } from './receptionist/receptionist.module';
import { PaymentsModule } from './payments/payments.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { MessagesModule } from './messages/messages.module';
import { SettingsModule } from './settings/settings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PatientPortalModule } from './patient-portal/patient-portal.module';
import { SchedulesModule } from './schedules/schedules.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { WebRtcModule } from './webrtc/webrtc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>("DATABASE_URL");
        const sslEnabled = configService.get<string>("DB_SSL", "false") === "true";

        const sslConfig = sslEnabled ? { rejectUnauthorized: false } : false;

        const commonOptions = {
          autoLoadEntities: true,
          synchronize: configService.get("NODE_ENV") !== "production",
          logging: configService.get("NODE_ENV") === "development",
        };

        if (databaseUrl) {
          return {
            type: "postgres",
            url: databaseUrl,
            ssl: sslConfig,
            extra: { family: 4 },
            ...commonOptions,
          };
        }

        return {
          type: "postgres",
          host: configService.get<string>("DB_HOST", "localhost"),
          port: Number(configService.get<string>("DB_PORT", "5432")),
          username: configService.get<string>("DB_USER", "postgres"),
          password: configService.get<string>("DB_PASS", "postgres"),
          database: configService.get<string>("DB_NAME", "postgres"),
          ssl: sslConfig,
          extra: { family: 4 },
          ...commonOptions,
        };
      },
    }),

    AuthModule,
    UsersModule,
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
    SchedulesModule,
    ConsultationsModule,
    WebRtcModule,
  ],
})
export class AppModule {}
