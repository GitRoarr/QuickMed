import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { ApplyTemplateDto } from './dto/apply-template.dto';
import { BulkSlotUpdateDto } from './dto/bulk-slot-update.dto';

@Controller('doctors/schedule')
export class SchedulesController {
  constructor(private readonly svc: SchedulesService) { }

  // Public variant for patients to request a specific doctor's schedule without relying on auth user
  @Get('public/:doctorId/:date')
  async getDayPublic(@Param('doctorId') doctorId: string, @Param('date') date: string) {
    return this.svc.getDaySchedule(doctorId, date);
  }

  // Patient-facing endpoints
  @Get('public/:doctorId/week/:startDate')
  async getWeekPublic(@Param('doctorId') doctorId: string, @Param('startDate') startDate: string) {
    return this.svc.getWeekSchedule(doctorId, startDate);
  }

  @Get('public/:doctorId/available-dates')
  async getAvailableDates(
    @Param('doctorId') doctorId: string,
    @Query('startDate') startDate: string,
    @Query('days') days: string = '30'
  ) {
    return this.svc.getAvailableDates(doctorId, startDate, parseInt(days, 10));
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Post('remove')
  async removeSlot(@Req() req: any, @Body() body: UpdateSlotDto) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    const start = body.startTime ?? body.time;
    const end = body.endTime ?? start;

    return this.svc.removeSlot(doctorId, body.date, start!, end!);
  }

  @UseGuards(JwtAuthGuard)
  @Get('overview')
  async getOverview(@Req() req: any, @Query('year') year: string, @Query('month') month: string) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.getMonthlyOverview(doctorId, Number(year), Number(month));
  }

  @UseGuards(JwtAuthGuard)
  @Get('blocked-days')
  async getBlockedDays(@Req() req: any, @Query('year') year: string, @Query('month') month: string) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.getBlockedDays(doctorId, Number(year), Number(month));
  }

  // Working days management
  @UseGuards(JwtAuthGuard)
  @Get('working-days')
  async getWorkingDays(@Req() req: any) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.getDoctorWorkingDays(doctorId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('working-days')
  async updateWorkingDays(@Req() req: any, @Body() body: { days: number[] }) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.updateDoctorWorkingDays(doctorId, body.days || []);
  }

  // Slot Generation
  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateSlots(@Req() req: any, @Body() body: GenerateSlotsDto) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.generateSlotsForDay(doctorId, body);
  }

  // Apply Template
  @UseGuards(JwtAuthGuard)
  @Post('apply-template')
  async applyTemplate(@Req() req: any, @Body() body: ApplyTemplateDto) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.applyTemplateToDateRange(doctorId, body);
  }

  // Bulk Update
  @UseGuards(JwtAuthGuard)
  @Post('bulk-update')
  async bulkUpdate(@Req() req: any, @Body() body: BulkSlotUpdateDto) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.bulkUpdateSlotStatus(doctorId, body);
  }

  // Enhanced Week View
  @UseGuards(JwtAuthGuard)
  @Get('week-detailed/:startDate')
  async getWeekDetailed(@Req() req: any, @Param('startDate') startDate: string) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.getWeekScheduleDetailed(doctorId, startDate);
  }

  // Month Overview
  @UseGuards(JwtAuthGuard)
  @Get('month-overview')
  async getMonthOverview(@Req() req: any, @Query('year') year: string, @Query('month') month: string) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.getMonthScheduleOverview(doctorId, Number(year), Number(month));
  }

  // Keep this catch-all day route last so it does not steal static routes like "working-days"
  @UseGuards(JwtAuthGuard)
  @Get(':date')
  async getDay(@Req() req: any, @Param('date') date: string) {
    const doctorId = req.user?.id ?? req.user?.sub ?? req.headers['x-doctor-id'];
    return this.svc.getDaySchedule(doctorId, date);
  }
}

