import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { NotificationPreferencesDto } from './dto/notification-preferences.dto';
import { UserRole } from '../common/index'; 

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
  ) {
    return await this.notificationsService.findAll(
      req.user.id,
      page,
      limit,
      type as any,
      priority as any,
    );
  }

  @Get('stats')
  async getStats(@Request() req) {
    return await this.notificationsService.getStats(req.user.id);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    if (!req.user || !req.user.id) {
      return { count: 0 };
    }
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Get('preferences')
  async getPreferences(@Request() req) {
    return await this.notificationsService.getPreferences(req.user.id);
  }

  @Put('preferences')
  async updatePreferences(
    @Request() req,
    @Body() preferencesDto: NotificationPreferencesDto,
  ) {
    return await this.notificationsService.updatePreferences(
      req.user.id,
      preferencesDto,
    );
  }

  @Get('templates')
  async getTemplates() {
    return await this.notificationsService.getTemplates();
  }

  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Fixed: Changed from 'admin' to UserRole.ADMIN
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Body() createTemplateDto: CreateNotificationTemplateDto) {
    return await this.notificationsService.createTemplate(createTemplateDto);
  }

  @Put('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Fixed: Changed from 'admin' to UserRole.ADMIN
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTemplateDto: UpdateNotificationTemplateDto,
  ) {
    return await this.notificationsService.updateTemplate(id, updateTemplateDto);
  }

  @Delete('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Fixed: Changed from 'admin' to UserRole.ADMIN
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    await this.notificationsService.deleteTemplate(id);
  }

  @Get('history')
  async getHistory(
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return await this.notificationsService.getHistory(userId, start, end);
  }

  @Get('analytics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Fixed: Changed from 'admin' to UserRole.ADMIN
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return await this.notificationsService.getAnalytics(start, end);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Fixed: Changed from 'admin' to UserRole.ADMIN
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return await this.notificationsService.create(createNotificationDto);
  }

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Fixed: Changed from 'admin' to UserRole.ADMIN
  @HttpCode(HttpStatus.CREATED)
  async sendToUser(
    @Body() body: { userId: string; notification: Partial<CreateNotificationDto> },
  ) {
    return await this.notificationsService.sendToUser(
      body.userId,
      body.notification,
    );
  }

  @Post('send-bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Fixed: Changed from 'admin' to UserRole.ADMIN
  @HttpCode(HttpStatus.CREATED)
  async sendToUsers(
    @Body() body: { userIds: string[]; notification: Partial<CreateNotificationDto> },
  ) {
    return await this.notificationsService.sendToUsers(
      body.userIds,
      body.notification,
    );
  }

  @Post('send-role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Fixed: Changed from 'admin' to UserRole.ADMIN
  @HttpCode(HttpStatus.CREATED)
  async sendToRole(
    @Body() body: { role: string; notification: Partial<CreateNotificationDto> },
  ) {
    return await this.notificationsService.sendToRole(
      body.role as any,
      body.notification,
    );
  }

  @Put('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.id);
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    await this.notificationsService.markAsRead(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return await this.notificationsService.update(id, updateNotificationDto);
  }

  @Delete('delete-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll(@Request() req) {
    await this.notificationsService.deleteAllForUser(req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.notificationsService.remove(id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.notificationsService.findOne(id);
  }

  @Post('cleanup')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Fixed: Changed from 'admin' to UserRole.ADMIN
  @HttpCode(HttpStatus.NO_CONTENT)
  async cleanupExpired() {
    await this.notificationsService.cleanupExpiredNotifications();
  }
}