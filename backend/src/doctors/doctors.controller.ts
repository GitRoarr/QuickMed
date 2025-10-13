import { Controller, Get, Post, Patch, Param, Delete, UseGuards } from "@nestjs/common"
import  { DoctorsService } from "./doctors.service"
import { CreateDoctorDto } from "./dto/create-doctor.dto"
import { UpdateDoctorDto } from "./dto/update-doctor.dto"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { UserRole } from "../users/entities/user.entity"

@Controller("doctors")
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.create(createDoctorDto)
  }

  @Get()
  findAll() {
    return this.doctorsService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  update(@Param('id') id: string, updateDoctorDto: UpdateDoctorDto) {
    return this.doctorsService.update(id, updateDoctorDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.doctorsService.remove(id);
  }
}
