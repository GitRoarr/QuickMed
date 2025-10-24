import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { DoctorsModule } from "./doctors/doctors.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { RolesGuard } from "./auth/guards/roles.guard";

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
        const databaseUrl = configService.get<string>('DATABASE_URL');

        console.log('=== Database Config Debug ===');
        console.log('Database URL:', databaseUrl);
        console.log('NODE_ENV:', configService.get<string>('NODE_ENV'));

        return {
          type: 'postgres',
          url: databaseUrl,
          ssl: {
            rejectUnauthorized: false, // required for Railway SSL
          },
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
          logging: configService.get<string>('NODE_ENV') === 'development',
        };
      },
    }),
    AuthModule,
    UsersModule,
    DoctorsModule,
    AppointmentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,  
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
