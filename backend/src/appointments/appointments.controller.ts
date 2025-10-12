import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from "@nestjs/common"
import type { AppointmentsService } from "./appointments.service"
import type { CreateAppointmentDto } from "./dto/create-appointment.dto"
import type { UpdateAppointmentDto } from "./dto/update-appointment.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { CurrentUser } from "../auth/decorators/current-user.decorator"
import { type User, UserRole } from "../users/entities/user.entity"

@Controller("appointments")
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  create(createAppointmentDto: CreateAppointmentDto, @CurrentUser() user: User) {
    return this.appointmentsService.create(createAppointmentDto, user.id)
  }

  @Get()
  @UseGuards(RolesGuard)
  findAll() {
    return this.appointmentsService.findAll()
  }

  @Get('my-appointments')
  getMyAppointments(@CurrentUser() user: User) {
    if (user.role === UserRole.PATIENT) {
      return this.appointmentsService.findByPatient(user.id);
    } else if (user.role === UserRole.DOCTOR) {
      return this.appointmentsService.findByDoctor(user.id);
    }
    return this.appointmentsService.findAll();
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
