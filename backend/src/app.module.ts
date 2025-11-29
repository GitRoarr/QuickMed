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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        url: configService.get("DATABASE_URL"),
        autoLoadEntities: true,
        synchronize: configService.get("NODE_ENV") !== "production",
        logging: configService.get("NODE_ENV") === "development",
        ssl: { rejectUnauthorized: false },
        extra: { family: 4 },
      }),
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
  ],
})
export class AppModule {}
