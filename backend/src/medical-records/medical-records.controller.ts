import { Controller, Post, Body, UseGuards, Get, Param, UseInterceptors, UploadedFile } from "@nestjs/common";
import { MedicalRecordsService } from "./medical-records.service";
import { CreateMedicalRecordDto } from "./dto/create-medical-record.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller('medical-records')
@UseGuards(JwtAuthGuard)
export class MedicalRecordsController {
  constructor(private readonly recordsService: MedicalRecordsService) {}

  @Post()
  create(@Body() dto: CreateMedicalRecordDto) {
    return this.recordsService.create(dto);
  }

  @Get('my')
  getMyRecords(@Param() params: any, @Body() body: any) {
    // JwtAuthGuard provides user via request; the decorator is not used here for brevity
    // The guard will attach user in request, but controller method can access using @Req if needed.
    // For simplicity frontend will call /medical-records/my and the service can be extended to read current user.
    // Here we assume frontend will pass patientId in query or that other controllers handle it.
    return { message: 'Please use GET /medical-records/patient/:patientId to fetch records for a patient' };
  }

  @Get('patient/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.recordsService.findByPatient(patientId);
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
}
