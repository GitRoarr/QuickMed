import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // adjust path if different
import { UpdateSlotDto } from './dto/update-slot.dto';

@UseGuards(JwtAuthGuard)
@Controller('doctors/schedule')
export class SchedulesController {
  constructor(private readonly svc: SchedulesService) {}

  @Get(':date')
  async getDay(@Req() req: any, @Param('date') date: string) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.getDaySchedule(doctorId, date);
  }

  @Post('available')
  setAvailable(@Req() req: any, @Body() body: UpdateSlotDto) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.setSlotStatus(doctorId, body.date, body.time, 'available');
  }

  @Post('block')
  blockSlot(@Req() req: any, @Body() body: UpdateSlotDto) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.setSlotStatus(doctorId, body.date, body.time, 'blocked', body.reason);
  }

  @Post('unblock')
  unblockSlot(@Req() req: any, @Body() body: UpdateSlotDto) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.setSlotStatus(doctorId, body.date, body.time, 'available');
  }

  @Get('overview')
  getOverview(@Req() req: any, @Query('year') year: string, @Query('month') month: string) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.getMonthlyOverview(doctorId, Number(year), Number(month));
  }

  @Get('blocked-days')
  getBlockedDays(@Req() req: any, @Query('year') year: string, @Query('month') month: string) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.getBlockedDays(doctorId, Number(year), Number(month));
  }
}