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

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Get all notifications for current user
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
      type,
      priority,
    );
  }

  // Get notification by ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.notificationsService.findOne(id);
  }

  // Create notification (admin only)
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return await this.notificationsService.create(createNotificationDto);
  }

  // Update notification
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return await this.notificationsService.update(id, updateNotificationDto);
  }

  // Delete notification
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.notificationsService.remove(id);
  }

  // Mark notification as read
  @Put(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
  }

  // Mark all notifications as read
  @Put('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.id);
  }

  // Delete all notifications
  @Delete('delete-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll(@Request() req) {
    await this.notificationsService.deleteAllForUser(req.user.id);
  }

  // Get notification statistics
  @Get('stats')
  async getStats(@Request() req) {
    return await this.notificationsService.getStats(req.user.id);
  }

  // Get unread count
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  // Get notification preferences
  @Get('preferences')
  async getPreferences(@Request() req) {
    return await this.notificationsService.getPreferences(req.user.id);
  }

  // Update notification preferences
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

  // Send notification to user (admin only)
  @Post('send')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async sendToUser(
    @Body() body: { userId: string; notification: Partial<CreateNotificationDto> },
  ) {
    return await this.notificationsService.sendToUser(
      body.userId,
      body.notification,
    );
  }

  // Send notification to multiple users (admin only)
  @Post('send-bulk')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async sendToUsers(
    @Body() body: { userIds: string[]; notification: Partial<CreateNotificationDto> },
  ) {
    return await this.notificationsService.sendToUsers(
      body.userIds,
      body.notification,
    );
  }

  // Send notification to users by role (admin only)
  @Post('send-role')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async sendToRole(
    @Body() body: { role: string; notification: Partial<CreateNotificationDto> },
  ) {
    return await this.notificationsService.sendToRole(
      body.role,
      body.notification,
    );
  }

  // Get notification templates
  @Get('templates')
  async getTemplates() {
    return await this.notificationsService.getTemplates();
  }

  // Create notification template (admin only)
  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Body() createTemplateDto: CreateNotificationTemplateDto) {
    return await this.notificationsService.createTemplate(createTemplateDto);
  }

  // Update notification template (admin only)
  @Put('templates/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateNotificationTemplateDto,
  ) {
    return await this.notificationsService.updateTemplate(id, updateTemplateDto);
  }

  // Delete notification template (admin only)
  @Delete('templates/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id') id: string) {
    await this.notificationsService.deleteTemplate(id);
  }

  // Get notification history
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

  // Get notification analytics (admin only)
  @Get('analytics')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return await this.notificationsService.getAnalytics(start, end);
  }

  // Cleanup expired notifications (admin only)
  @Post('cleanup')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cleanupExpired() {
    await this.notificationsService.cleanupExpiredNotifications();
  }
}

