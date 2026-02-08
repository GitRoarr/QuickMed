import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UnauthorizedException } from "@nestjs/common"
import  { AppointmentsService } from "./appointments.service"
import  { CreateAppointmentDto } from "./dto/create-appointment.dto"
import  { UpdateAppointmentDto } from "./dto/update-appointment.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { CurrentUser } from "../auth/decorators/current-user.decorator"
import { User} from "../users/entities/user.entity"
import { UserRole } from "../common/index"


@Controller("appointments")
@UseGuards(JwtAuthGuard)

export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  create(@Body() createAppointmentDto: CreateAppointmentDto, @CurrentUser() user: User) {
    return this.appointmentsService.create(createAppointmentDto, user.id, user.role)
  }
  
  

  @Get()
  @UseGuards(RolesGuard)
  findAll() {
    return this.appointmentsService.findAll()
  }

  @Get('my-appointments')
  async getMyAppointments(@CurrentUser() user: User) {
    if (!user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    try {
      if (user.role === UserRole.PATIENT) {
        return await this.appointmentsService.findByPatient(user.id);
      } else if (user.role === UserRole.DOCTOR) {
        return await this.appointmentsService.findByDoctor(user.id);
      }
      return await this.appointmentsService.findAll();
    } catch (error) {
      console.error('[AppointmentsController] Failed to load my-appointments', error);
      return [];
    }
  }

  @Get('pending-count')
  async getPendingCount(@Req() req: any) {
    const doctorId = req.user?.id ?? req.user?.sub;
    const count = await this.appointmentsService.getPendingCountForDoctor(doctorId);
    return { count };
  }

  @Get('patient/:patientId')
  @UseGuards(RolesGuard)
  findByPatient(@Param('patientId') patientId: string) {
    return this.appointmentsService.findByPatient(patientId);
  }

  @Get('doctor/:doctorId')
  findByDoctor(@Param('doctorId') doctorId: string) {
    return this.appointmentsService.findByDoctor(doctorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(":id")
  update(@Param('id') id: string, @Body() updateAppointmentDto: UpdateAppointmentDto, @CurrentUser() user: User) {
    return this.appointmentsService.update(id, updateAppointmentDto, user)
  }

  @Patch(":id/cancel")
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.appointmentsService.cancel(id, user)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }
}
