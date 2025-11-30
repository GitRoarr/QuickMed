import { Controller, Get, Post, Patch, Param, Delete, Body, UseGuards } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { SetDoctorPasswordDto } from './dto/set-doctor-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/index';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createDoctorInvite(@Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.createDoctorInvite(createDoctorDto);
  }

  @Post('set-password')
  setDoctorPassword(@Body() body: SetDoctorPasswordDto) {
    return this.doctorsService.setDoctorPassword(body.uid, body.token, body.password);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  getDashboardData(@CurrentUser() user: User) {
    return this.doctorsService.getDashboardData(user.id);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats(@CurrentUser() user: User) {
    return this.doctorsService.getStats(user.id);
  }

  @Patch(':id/validate-license')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  validateLicense(@Param('id') id: string) {
    return this.doctorsService.validateLicense(id);
  }

  @Patch(':id/confirm-employment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  confirmEmployment(@Param('id') id: string) {
    return this.doctorsService.confirmEmployment(id);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  activateDoctor(@Param('id') id: string) {
    return this.doctorsService.activateDoctor(id);
  }

  @Get()
  findAll() {
    return this.doctorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  update(@Param('id') id: string, @Body() updateDoctorDto: UpdateDoctorDto) {
    return this.doctorsService.update(id, updateDoctorDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.doctorsService.remove(id);
  }
}
