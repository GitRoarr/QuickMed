import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentsService } from '../appointments/appointments.service';

@Injectable()
export class AppointmentStatusCronService {
  private readonly logger = new Logger(AppointmentStatusCronService.name);

  constructor(private readonly appointmentsService: AppointmentsService) {}

  // Runs every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async handleMissedAppointments() {
    this.logger.debug('Checking for missed/overdue appointments...');
    await this.appointmentsService.markMissedAndOverdueAppointments();
  }
}
