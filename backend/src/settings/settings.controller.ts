import { Controller, Get, Patch, Body, UseGuards, Param, Delete, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) { }

  @Get()
  getSettings(@CurrentUser() user: User) {
    return this.settingsService.getSettings(user.id);
  }

  @Patch()
  updateSettings(@Body() updateData: any, @CurrentUser() user: User) {
    return this.settingsService.updateSettings(user.id, updateData);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.settingsService.getProfile(user.id);
  }

  @Patch('profile')
  updateProfile(@Body() profileData: any, @CurrentUser() user: User) {
    return this.settingsService.updateProfile(user.id, profileData);
  }

  // Doctor Services
  @Get('services')
  getServices(@CurrentUser() user: User, @Query('doctorId') doctorId?: string) {
    return this.settingsService.getDoctorServices(doctorId || user.id);
  }

  @Patch('services/add')
  addService(@Body() serviceData: any, @CurrentUser() user: User) {
    return this.settingsService.addDoctorService(user.id, serviceData);
  }

  @Patch('services/:id')
  updateService(@Body() updateData: any, @CurrentUser() user: User, @Param('id') id: string) {
    return this.settingsService.updateDoctorService(id, user.id, updateData);
  }

  @Delete('services/:id')
  deleteService(@CurrentUser() user: User, @Param('id') id: string) {
    return this.settingsService.deleteDoctorService(id, user.id);
  }
}
