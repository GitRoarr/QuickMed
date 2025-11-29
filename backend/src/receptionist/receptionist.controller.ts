import { Controller, UseGuards, Post, Body, Get, Param, Patch, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/index';
import { ReceptionistService } from './receptionist.service';
import { AdminService } from '../admin/admin.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { CreateAppointmentDto } from '../appointments/dto/create-appointment.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { UsersService } from '../users/users.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateReceptionistInviteDto } from './dto/create-receptionist-invite.dto';
import { SetReceptionistPasswordDto } from './dto/set-receptionist-password.dto';

@Controller('receptionist')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReceptionistController {
  constructor(
    private readonly receptionistService: ReceptionistService,
    private readonly appointmentsService: AppointmentsService,
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,
  ) {}

  @Post('patients')
  @Roles(UserRole.RECEPTIONIST, UserRole.ADMIN)
  async createPatient(@Body() dto: CreateUserDto) {
    // force role to PATIENT regardless
    dto.role = UserRole.PATIENT;
    // reuse AdminService to ensure temp-password + notifications behavior
    return this.adminService.createUser(dto as any);
  }

  @Patch('patients/:id')
  @Roles(UserRole.RECEPTIONIST, UserRole.ADMIN)
  async updatePatient(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto as any);
  }

  @Get('patients')
  @Roles(UserRole.RECEPTIONIST, UserRole.ADMIN)
  async listPatients(@Query('search') search?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return (this.usersService as any).findPatients();
  }

  @Post('appointments')
  @Roles(UserRole.RECEPTIONIST, UserRole.ADMIN)
  async createAppointment(@Body() dto: CreateAppointmentDto, @CurrentUser() user: User) {
    // ensure receptionistId is set to current user
    dto.receptionistId = user.id;
    // reuse AppointmentsService.create; pass patientId from dto
    return this.appointmentsService.create(dto, dto.patientId);
  }

  @Patch('appointments/:id')
  @Roles(UserRole.RECEPTIONIST, UserRole.ADMIN)
  async updateAppointment(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: User) {
    return this.appointmentsService.update(id, dto, user as any);
  }

  @Patch('appointments/:id/arrive')
  @Roles(UserRole.RECEPTIONIST, UserRole.ADMIN)
  async markArrived(@Param('id') id: string, @CurrentUser() user: User) {
    return this.appointmentsService.update(id, { arrived: true, status: 'waiting', receptionistId: user.id } as any, user as any);
  }

  @Patch('appointments/:id/payment')
  @Roles(UserRole.RECEPTIONIST, UserRole.ADMIN)
  async setPayment(@Param('id') id: string, @Body() body: { paymentStatus: string }, @CurrentUser() user: User) {
    return this.appointmentsService.update(id, { paymentStatus: body.paymentStatus } as any, user as any);
  }

  @Get('dashboard')
  @Roles(UserRole.RECEPTIONIST, UserRole.ADMIN)
  async dashboard(@Query('doctorId') doctorId?: string, @Query('status') status?: string) {
    return this.receptionistService.getDashboardInsights({ doctorId, status });
  }

  // Invitation endpoints (public - no auth required for setting password)
  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createReceptionistInvite(@Body() dto: CreateReceptionistInviteDto) {
    return this.receptionistService.createReceptionistInvite(dto);
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  async setReceptionistPassword(@Body() dto: SetReceptionistPasswordDto) {
    return this.receptionistService.setReceptionistPassword(dto.uid, dto.token, dto.password);
  }
}
