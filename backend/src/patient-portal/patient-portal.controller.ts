import { Controller, Get, UseGuards, Post, Param } from '@nestjs/common';
import { PatientPortalService } from './patient-portal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('patient-portal')
@UseGuards(JwtAuthGuard)
export class PatientPortalController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) {
    return this.patientPortalService.getDashboard(user.id);
  }

  @Post('prescriptions/:id/refill-request')
  requestRefill(@Param('id') id: string, @CurrentUser() user: User) {
    return this.patientPortalService.requestPrescriptionRefill(user.id, id);
  }
}

