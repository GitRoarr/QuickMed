import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UpdateUserActiveDto } from '../users/dto/update-user-active.dto';
import { CreateAppointmentDto } from '../appointments/dto/create-appointment.dto';
import { UpdateAppointmentDto } from '../appointments/dto/update-appointment.dto';
import { UserRole } from '../common/index';
import { DoctorsService } from '@/doctors/doctors.service';
import { CreateDoctorDto } from '@/doctors/dto/create-doctor.dto';
import { UpdateDoctorDto } from '@/doctors/dto/update-doctor.dto';
import { ThemeService } from './theme.service';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { ReceptionistService } from '../receptionist/receptionist.service';
import { CreateReceptionistInviteDto } from '../receptionist/dto/create-receptionist-invite.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly doctorsService: DoctorsService,
    private readonly themeService: ThemeService,
    private readonly receptionistService: ReceptionistService
  ) {}

  @Get('dashboard')
  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getAdminData(@Query('type') type?: string) {
    return type === 'stats' ? this.adminService.getAdminStats() : this.adminService.getDashboardData();
  }

  // ---------------- User Management ----------------
  @Get('users')
  @Roles(UserRole.ADMIN)
  async getAllUsers(
    @Query('page') page: number | string = 1,
    @Query('limit') limit: number | string = 10,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(
      Math.max(1, Number(page) || 1),
      Math.max(1, Math.min(50, Number(limit) || 10)),
      role,
      search
    );
  }

  @Get('users/:id')
  @Roles(UserRole.ADMIN)
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Get('users/:id/export')
  @Roles(UserRole.ADMIN)
  async exportUserData(@Param('id') id: string) {
    return this.adminService.exportUserData(id);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Put('users/:id')
  @Roles(UserRole.ADMIN)
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch('users/:id/active')
  @Roles(UserRole.ADMIN)
  async updateUserActive(@Param('id') id: string, @Body() dto: UpdateUserActiveDto) {
    return this.adminService.updateUser(id, { isActive: dto.isActive } as any);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  async deleteUser(@Param('id') id: string) {
    await this.adminService.deleteUser(id);
  }

  // ---------------- Appointment Management ----------------
  @Get('appointments')
  @Roles(UserRole.ADMIN)
  async getAllAppointments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.adminService.getAllAppointments(page, limit, status, search);
  }

  @Get('appointments/:id')
  @Roles(UserRole.ADMIN)
  async getAppointmentById(@Param('id') id: string) {
    return this.adminService.getAppointmentById(id);
  }

  @Post('appointments')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  async createAppointment(@Body() dto: CreateAppointmentDto) {
    return this.adminService.createAppointment(dto);
  }

  @Put('appointments/:id')
  @Roles(UserRole.ADMIN)
  async updateAppointment(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.adminService.updateAppointment(id, dto);
  }

  @Delete('appointments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  async deleteAppointment(@Param('id') id: string) {
    await this.adminService.deleteAppointment(id);
  }

  // ---------------- System & Reports ----------------
  @Get('system/health')
  @Roles(UserRole.ADMIN)
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('notifications')
  @Roles(UserRole.ADMIN)
  async getSystemNotifications() {
    return this.adminService.getSystemNotifications();
  }

  @Get('settings/security')
  @Roles(UserRole.ADMIN)
  getSecuritySettings() {
    return this.adminService.getSecuritySettings();
  }

  @Post('reports')
  @Roles(UserRole.ADMIN)
  async generateReport(@Body() req: { type: 'users' | 'appointments' | 'revenue'; startDate?: string; endDate?: string }) {
    return this.adminService.generateReport(
      req.type,
      req.startDate ? new Date(req.startDate) : undefined,
      req.endDate ? new Date(req.endDate) : undefined
    );
  }

  // ---------------- Doctor Management ----------------
  @Post('doctors/invite')
  @Post('doctors')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async inviteDoctor(@Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.createDoctorInvite(createDoctorDto);
  }

  @Patch('doctors/:id/validate-license')
  @Roles(UserRole.ADMIN)
  async validateDoctorLicense(@Param('id') doctorId: string) {
    return this.doctorsService.validateLicense(doctorId);
  }

  @Patch('doctors/:id/confirm-employment')
  @Roles(UserRole.ADMIN)
  async confirmDoctorEmployment(@Param('id') doctorId: string) {
    return this.doctorsService.confirmEmployment(doctorId);
  }

  @Patch('doctors/:id/activate')
  @Roles(UserRole.ADMIN)
  async activateDoctor(@Param('id') doctorId: string) {
    return this.doctorsService.activateDoctor(doctorId);
  }

  @Patch('doctors/:id')
  @Roles(UserRole.ADMIN)
  async updateDoctor(@Param('id') doctorId: string, @Body() updateDoctorDto: UpdateDoctorDto) {
    return this.doctorsService.update(doctorId, updateDoctorDto);
  }

  @Delete('doctors/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  async removeDoctor(@Param('id') doctorId: string) {
    await this.doctorsService.remove(doctorId);
  }

  @Get('doctors')
  @Roles(UserRole.ADMIN)
  async getAllDoctors() {
    return this.doctorsService.findAll();
  }

  @Get('doctors/overview')
  @Roles(UserRole.ADMIN)
  async getDoctorsOverview(
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'pending',
    @Query('specialty') specialty?: string,
  ) {
    return this.adminService.getDoctorsOverview(search, status as any, specialty);
  }

  // ---------------- Receptionist Management ----------------
  @Post('receptionists/invite')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async inviteReceptionist(@Body() dto: CreateReceptionistInviteDto) {
    return this.receptionistService.createReceptionistInvite(dto);
  }

  // ---------------- Analytics ----------------
  @Get('analytics')
  @Roles(UserRole.ADMIN)
  async getAnalytics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.adminService.getAnalyticsData(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  // ---------------- Theme Management ----------------
  @Get('theme')
  @Roles(UserRole.ADMIN)
  async getActiveTheme() {
    return this.themeService.getActiveTheme();
  }

  @Get('themes')
  @Roles(UserRole.ADMIN)
  async getAllThemes() {
    return this.themeService.getAllThemes();
  }

  @Get('themes/:id')
  @Roles(UserRole.ADMIN)
  async getThemeById(@Param('id') id: string) {
    return this.themeService.getThemeById(id);
  }

  @Post('themes')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  async createTheme(@Body() dto: CreateThemeDto) {
    return this.themeService.createTheme(dto);
  }

  @Put('themes/:id')
  @Roles(UserRole.ADMIN)
  async updateTheme(@Param('id') id: string, @Body() dto: UpdateThemeDto) {
    return this.themeService.updateTheme(id, dto);
  }

  @Patch('themes/:id/activate')
  @Roles(UserRole.ADMIN)
  async setActiveTheme(@Param('id') id: string) {
    return this.themeService.setActiveTheme(id);
  }

  @Delete('themes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  async deleteTheme(@Param('id') id: string) {
    await this.themeService.deleteTheme(id);
  }

  // ---------------- Password Reset (Admin Only) ----------------
  @Patch('users/:id/reset-password')
  @Roles(UserRole.ADMIN)
  async resetUserPassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
  ) {
    await this.adminService.resetUserPassword(id, body.newPassword);
    return { message: 'Password reset successfully' };
  }

  @Patch('users/reset-password-by-email')
  @Roles(UserRole.ADMIN)
  async resetUserPasswordByEmail(
    @Body() body: { email: string; newPassword: string },
  ) {
    await this.adminService.resetUserPasswordByEmail(body.email, body.newPassword);
    return { message: 'Password reset successfully' };
  }
}
