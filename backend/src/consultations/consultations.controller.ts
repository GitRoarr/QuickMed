import { Body, Controller, Get, Param, Post, Patch, Query, UseGuards } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { StartConsultationDto } from './dto/start-consultation.dto';
import { RateConsultationDto } from './dto/rate-consultation.dto';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';


@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(private readonly service: ConsultationsService) {}

  @Post()
  create(@Body() dto: CreateConsultationDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.id);
  }

  @Post('start')
  start(@Body() dto: StartConsultationDto) {
    return this.service.start(dto);
  }

  @Post(':id/end')
  end(@Param('id') id: string) {
    return this.service.end(id);
  }

  @Post(':id/rate')
  rate(@Param('id') id: string, @Body() dto: RateConsultationDto) {
    return this.service.rate(id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateConsultationDto>, @CurrentUser() user: User) {
    return this.service.update(id, dto, user.id);
  }

  @Get('my-consultations')
  getMyConsultations(@CurrentUser() user: User) {
    return this.service.findByUser(user.id, user.role);
  }

  @Get('by-appointment/:appointmentId')
  findByAppointmentId(@Param('appointmentId') appointmentId: string) {
    return this.service.findByAppointmentId(appointmentId);
  }

  @Get('stats')
  stats(@Query('start') start?: string, @Query('end') end?: string) {
    return this.service.stats(start, end);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
