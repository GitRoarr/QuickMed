import { Controller, Get, Post, Body, Param, Delete, Patch, Query, UseGuards } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PrescriptionStatus } from './entities/prescription.entity';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  create(@Body() createDto: CreatePrescriptionDto, @CurrentUser() user: User) {
    return this.prescriptionsService.create(createDto, user.id);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('search') search?: string,
    @Query('appointmentId') appointmentId?: string,
    @Query('patientId') patientId?: string,
  ) {
    if (search) {
      return this.prescriptionsService.search(user.id, search);
    }
    if (appointmentId) {
      return this.prescriptionsService.findByAppointment(appointmentId, user.id);
    }
    if (patientId) {
      return this.prescriptionsService.findByPatient(patientId, user.id);
    }
    return this.prescriptionsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.prescriptionsService.findOne(id, user.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: PrescriptionStatus,
    @CurrentUser() user: User,
  ) {
    return this.prescriptionsService.updateStatus(id, status, user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.prescriptionsService.delete(id, user.id);
  }
}
