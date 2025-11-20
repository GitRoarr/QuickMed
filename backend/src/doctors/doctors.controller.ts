import { Controller, Get, Post, Patch, Param, Delete, Body, UseGuards } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { SetDoctorPasswordDto } from './dto/set-doctor-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/index';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createDoctorInvite(@Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.createDoctorInvite(createDoctorDto); // Admin invites doctor
  }

  @Post('set-password')
  setDoctorPassword(@Body() body: SetDoctorPasswordDto) {
    return this.doctorsService.setDoctorPassword(body.uid, body.token, body.password); // Doctor sets password
  }

  @Patch(':id/validate-license')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  validateLicense(@Param('id') id: string) {
    return this.doctorsService.validateLicense(id); // Admin validates license
  }

  @Patch(':id/confirm-employment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  confirmEmployment(@Param('id') id: string) {
    return this.doctorsService.confirmEmployment(id); // Admin confirms employment
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  activateDoctor(@Param('id') id: string) {
    return this.doctorsService.activateDoctor(id); // Admin activates doctor
  }

  @Get()
  findAll() {
    return this.doctorsService.findAll(); // List all doctors
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id); // Get single doctor
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  update(@Param('id') id: string, @Body() updateDoctorDto: UpdateDoctorDto) {
    return this.doctorsService.update(id, updateDoctorDto); // Update doctor
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.doctorsService.remove(id); // Delete doctor
  }
}
