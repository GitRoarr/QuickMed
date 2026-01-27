import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AvailabilityTemplate } from './entities/availability-template.entity';

export interface CreateTemplateDto {
    name: string;
    workingDays: number[];
    startTime: string;
    endTime: string;
    slotDuration?: number;
    bufferMinutes?: number;
    breaks?: { startTime: string; endTime: string; label?: string }[];
    validFrom?: Date;
    validTo?: Date;
    description?: string;
    isDefault?: boolean;
}

@Injectable()
export class AvailabilityTemplateService {
    constructor(
        @InjectRepository(AvailabilityTemplate)
        private readonly templateRepo: Repository<AvailabilityTemplate>,
    ) { }

    async createTemplate(
        doctorId: string,
        data: CreateTemplateDto,
    ): Promise<AvailabilityTemplate> {
        // If setting as default, unset other defaults
        if (data.isDefault) {
            await this.templateRepo.update(
                { doctorId, isDefault: true },
                { isDefault: false },
            );
        }

        const template = this.templateRepo.create({
            doctorId,
            name: data.name,
            workingDays: data.workingDays,
            startTime: data.startTime,
            endTime: data.endTime,
            slotDuration: data.slotDuration || 30,
            bufferMinutes: data.bufferMinutes || 0,
            breaks: data.breaks || [],
            validFrom: data.validFrom || null,
            validTo: data.validTo || null,
            description: data.description || null,
            isDefault: data.isDefault || false,
        });

        return this.templateRepo.save(template);
    }

    async getTemplates(doctorId: string): Promise<AvailabilityTemplate[]> {
        return this.templateRepo.find({
            where: { doctorId },
            order: { isDefault: 'DESC', createdAt: 'ASC' },
        });
    }

    async getTemplate(id: string, doctorId: string): Promise<AvailabilityTemplate> {
        const template = await this.templateRepo.findOne({
            where: { id, doctorId },
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        return template;
    }

    async getDefaultTemplate(doctorId: string): Promise<AvailabilityTemplate | null> {
        return this.templateRepo.findOne({
            where: { doctorId, isDefault: true },
        });
    }

    async updateTemplate(
        id: string,
        doctorId: string,
        data: Partial<CreateTemplateDto>,
    ): Promise<AvailabilityTemplate> {
        const template = await this.getTemplate(id, doctorId);

        // If setting as default, unset other defaults
        if (data.isDefault && !template.isDefault) {
            await this.templateRepo.update(
                { doctorId, isDefault: true },
                { isDefault: false },
            );
        }

        Object.assign(template, data);
        return this.templateRepo.save(template);
    }

    async deleteTemplate(id: string, doctorId: string): Promise<void> {
        const template = await this.getTemplate(id, doctorId);
        await this.templateRepo.remove(template);
    }

    async createPresetTemplates(doctorId: string): Promise<AvailabilityTemplate[]> {
        const presets: CreateTemplateDto[] = [
            {
                name: 'Weekdays 9-5',
                workingDays: [1, 2, 3, 4, 5],
                startTime: '09:00',
                endTime: '17:00',
                slotDuration: 30,
                bufferMinutes: 5, breaks: [{ startTime: '12:00', endTime: '13:00', label: 'Lunch Break' }],
                description: 'Standard weekday schedule with lunch break',
            },
            {
                name: 'Morning Clinic',
                workingDays: [1, 2, 3, 4, 5],
                startTime: '08:00',
                endTime: '12:00',
                slotDuration: 20,
                bufferMinutes: 5,
                description: 'Morning-only clinic hours',
            },
            {
                name: 'Evening Clinic',
                workingDays: [1, 2, 3, 4, 5],
                startTime: '16:00',
                endTime: '20:00',
                slotDuration: 30,
                bufferMinutes: 5,
                description: 'Evening clinic hours for working patients',
            },
            {
                name: 'Mon-Wed-Fri',
                workingDays: [1, 3, 5],
                startTime: '09:00',
                endTime: '17:00',
                slotDuration: 30,
                bufferMinutes: 5,
                breaks: [{ startTime: '12:30', endTime: '13:30', label: 'Lunch' }],
                description: 'Alternate weekday schedule',
            },
        ];

        const created: AvailabilityTemplate[] = [];

        for (const preset of presets) {
            const existing = await this.templateRepo.findOne({
                where: { doctorId, name: preset.name },
            });

            if (!existing) {
                const template = await this.createTemplate(doctorId, preset);
                created.push(template);
            }
        }

        return created;
    }
}
