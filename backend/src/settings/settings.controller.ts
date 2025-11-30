import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

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
}
