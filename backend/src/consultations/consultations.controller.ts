import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { StartConsultationDto } from './dto/start-consultation.dto';
import { RateConsultationDto } from './dto/rate-consultation.dto';


@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly service: ConsultationsService) {}

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

  @Get('by-appointment/:appointmentId')
  findByAppointmentId(@Param('appointmentId') appointmentId: string) {
    return this.service.findByAppointmentId(appointmentId);
  }

  @Get('stats')
  stats(@Query('start') start?: string, @Query('end') end?: string) {
    return this.service.stats(start, end);
  }

  @Get(':appointmentId')
  findByAppointmentIdFallback(@Param('appointmentId') appointmentId: string) {
    return this.service.findByAppointmentId(appointmentId);
  }
}
