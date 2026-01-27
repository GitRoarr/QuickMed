import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/index';
import { AvailabilityTemplateService, CreateTemplateDto } from './availability-template.service';

@Controller('doctors/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DOCTOR)
export class AvailabilityTemplateController {
    constructor(private readonly templateService: AvailabilityTemplateService) { }

    @Get()
    async getTemplates(@Request() req) {
        return this.templateService.getTemplates(req.user.id);
    }

    @Get('default')
    async getDefaultTemplate(@Request() req) {
        return this.templateService.getDefaultTemplate(req.user.id);
    }

    @Get('presets')
    async createPresets(@Request() req) {
        return this.templateService.createPresetTemplates(req.user.id);
    }

    @Get(':id')
    async getTemplate(@Param('id') id: string, @Request() req) {
        return this.templateService.getTemplate(id, req.user.id);
    }

    @Post()
    async createTemplate(@Body() data: CreateTemplateDto, @Request() req) {
        return this.templateService.createTemplate(req.user.id, data);
    }

    @Put(':id')
    async updateTemplate(
        @Param('id') id: string,
        @Body() data: Partial<CreateTemplateDto>,
        @Request() req,
    ) {
        return this.templateService.updateTemplate(id, req.user.id, data);
    }

    @Delete(':id')
    async deleteTemplate(@Param('id') id: string, @Request() req) {
        await this.templateService.deleteTemplate(id, req.user.id);
        return { success: true };
    }
}
