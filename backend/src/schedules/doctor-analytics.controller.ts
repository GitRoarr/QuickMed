import {
    Controller,
    Get,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/index';
import { DoctorAnalyticsService } from './doctor-analytics.service';

@Controller('doctors/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DOCTOR)
export class DoctorAnalyticsController {
    constructor(private readonly analyticsService: DoctorAnalyticsService) { }

    @Get()
    async getAnalytics(@Request() req, @Query('period') period: string = '6months') {
        return this.analyticsService.getAnalytics(req.user.id, period);
    }

    @Get('today')
    async getTodayStats(@Request() req) {
        return this.analyticsService.getTodayStats(req.user.id);
    }

    @Get('week')
    async getWeekStats(@Request() req, @Query('startDate') startDate?: string) {
        return this.analyticsService.getWeekStats(req.user.id, startDate);
    }

    @Get('month')
    async getMonthStats(
        @Request() req,
        @Query('year') year: string,
        @Query('month') month: string,
    ) {
        return this.analyticsService.getMonthStats(
            req.user.id,
            parseInt(year, 10),
            parseInt(month, 10),
        );
    }
}
