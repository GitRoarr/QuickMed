import { Controller, Post, Body, UseGuards, Get, Param, Delete, Patch, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from '@nestjs/platform-express';
import { MedicalRecordsService } from "./medical-records.service";
import { CreateMedicalRecordDto } from "./dto/create-medical-record.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { UserRole } from "../common/index";
import { diskStorage } from "multer";
import * as os from "os";

@Controller('medical-records')
@UseGuards(JwtAuthGuard)
export class MedicalRecordsController {
  constructor(private readonly recordsService: MedicalRecordsService) { }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: os.tmpdir(),
        filename: (req, file, cb) => {
          const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`
          cb(null, filename)
        },
      }),
    }),
  )
  uploadRecord(@UploadedFile() file: Express.Multer.File, @Body('patientId') patientId: string, @Body('doctorId') doctorId: string) {
    return this.recordsService.saveRecordFile(file, patientId, doctorId);
  }

  @Post()
  create(@Body() dto: CreateMedicalRecordDto, @CurrentUser() user: User) {
    if (!dto.doctorId) {
      dto.doctorId = user.id;
    }
    return this.recordsService.create(dto);
  }

  @Get('stats')
  getStats(@CurrentUser() user: User) {
    if (user.role === UserRole.DOCTOR) {
      return this.recordsService.getStatsByDoctor(user.id);
    }
    return this.recordsService.getStatsByPatient(user.id);
  }

  @Get('my')
  getMyRecords(@CurrentUser() user: User, @Query('search') search?: string) {
    if (user.role === UserRole.DOCTOR) {
      return this.recordsService.findByDoctor(user.id, search);
    } else {
      return this.recordsService.findByPatient(user.id);
    }
  }

  @Get('patient/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.recordsService.findByPatient(patientId);
  }

  @Get('appointment/:appointmentId')
  findByAppointment(@Param('appointmentId') appointmentId: string) {
    return this.recordsService.findByAppointment(appointmentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recordsService.findOne(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string) {
    const rec = await this.recordsService.findOne(id);
    return { url: rec.fileUrl };
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: User,
  ) {
    return this.recordsService.updateStatus(id, status, user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.recordsService.delete(id, user.id);
  }
}
