import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { CreateAppointmentDto } from '../appointments/dto/create-appointment.dto';
import { UpdateAppointmentDto } from '../appointments/dto/update-appointment.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboardData() {
    return await this.adminService.getDashboardData();
  }

  @Get('stats')
  async getAdminStats() {
    return await this.adminService.getAdminStats();
  }

  @Get('users')
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('role') role?: string,
  ) {
    return await this.adminService.getAllUsers(page, limit, role);
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return await this.adminService.getUserById(id);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.adminService.createUser(createUserDto);
  }

  @Put('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.adminService.updateUser(id, updateUserDto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string) {
    await this.adminService.deleteUser(id);
  }

  @Get('appointments')
  async getAllAppointments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    return await this.adminService.getAllAppointments(page, limit, status);
  }

  @Get('appointments/:id')
  async getAppointmentById(@Param('id') id: string) {
    return await this.adminService.getAppointmentById(id);
  }

  @Post('appointments')
  @HttpCode(HttpStatus.CREATED)
  async createAppointment(@Body() createAppointmentDto: CreateAppointmentDto) {
    return await this.adminService.createAppointment(createAppointmentDto);
  }

  @Put('appointments/:id')
  async updateAppointment(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return await this.adminService.updateAppointment(id, updateAppointmentDto);
  }

  @Delete('appointments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAppointment(@Param('id') id: string) {
    await this.adminService.deleteAppointment(id);
  }

  @Get('system/health')
  async getSystemHealth() {
    return await this.adminService.getSystemHealth();
  }

  @Get('notifications')
  async getSystemNotifications() {
    return await this.adminService.getSystemNotifications();
  }

  @Get('users/:id/export')
  async exportUserData(@Param('id') id: string) {
    return await this.adminService.exportUserData(id);
  }

  @Post('reports')
  async generateReport(
    @Body() reportRequest: {
      type: 'users' | 'appointments' | 'revenue';
      startDate?: string;
      endDate?: string;
    },
  ) {
    const startDate = reportRequest.startDate ? new Date(reportRequest.startDate) : undefined;
    const endDate = reportRequest.endDate ? new Date(reportRequest.endDate) : undefined;
    
    return await this.adminService.generateReport(
      reportRequest.type,
      startDate,
      endDate,
    );
  }
}

