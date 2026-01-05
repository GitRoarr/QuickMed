import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

  // Public variant for patients to request a specific doctor's schedule without relying on auth user
  @Get('public/:doctorId/:date')
  async getDayPublic(@Param('doctorId') doctorId: string, @Param('date') date: string) {
    return this.svc.getDaySchedule(doctorId, date);
  }

  @Post('available')
  async setAvailable(@Req() req: any, @Body() body: UpdateSlotDto) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    const start = body.startTime ?? body.time;
    const end = body.endTime ?? start;

    if (start === end) {
      return this.svc.setSingleSlotStatus(doctorId, body.date, start!, 'available');
    } else {
      return this.svc.setRangeSlotStatus(doctorId, body.date, start!, end!, 'available');
    }
  }

  @Post('block')
  async blockSlot(@Req() req: any, @Body() body: UpdateSlotDto) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    const start = body.startTime ?? body.time;
    const end = body.endTime ?? start;

    if (start === end) {
      return this.svc.setSingleSlotStatus(doctorId, body.date, start!, 'blocked', body.reason);
    } else {
      return this.svc.setRangeSlotStatus(doctorId, body.date, start!, end!, 'blocked', body.reason);
    }
  }

  @Post('unblock')
  async unblockSlot(@Req() req: any, @Body() body: UpdateSlotDto) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    const start = body.startTime ?? body.time;
    const end = body.endTime ?? start;

    if (start === end) {
      return this.svc.setSingleSlotStatus(doctorId, body.date, start!, 'available');
    } else {
      return this.svc.setRangeSlotStatus(doctorId, body.date, start!, end!, 'available');
    }
  }

  @Post('remove')
  async removeSlot(@Req() req: any, @Body() body: UpdateSlotDto) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    const start = body.startTime ?? body.time;
    const end = body.endTime ?? start;

    return this.svc.removeSlot(doctorId, body.date, start!, end!);
  }

  @Get('overview')
  async getOverview(@Req() req: any, @Query('year') year: string, @Query('month') month: string) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.getMonthlyOverview(doctorId, Number(year), Number(month));
  }

  @Get('blocked-days')
  async getBlockedDays(@Req() req: any, @Query('year') year: string, @Query('month') month: string) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.getBlockedDays(doctorId, Number(year), Number(month));
  }

  // Working days management
  @Get('working-days')
  async getWorkingDays(@Req() req: any) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.getDoctorWorkingDays(doctorId);
  }

  @Post('working-days')
  async updateWorkingDays(@Req() req: any, @Body() body: { days: number[] }) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.updateDoctorWorkingDays(doctorId, body.days || []);
  }
}
