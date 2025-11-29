import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Theme } from './entities/theme.entity';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';

@Injectable()
export class ThemeService {
  constructor(
    @InjectRepository(Theme)
    private themeRepository: Repository<Theme>,
  ) {}

  async getActiveTheme(): Promise<Theme> {
    let theme = await this.themeRepository.findOne({
      where: { isActive: true },
    });

    if (!theme) {
      // Create default theme if none exists
      theme = this.themeRepository.create({
        name: 'default',
        mode: 'light',
        isActive: true,
      });
      theme = await this.themeRepository.save(theme);
    }

    return theme;
  }

  async getAllThemes(): Promise<Theme[]> {
    return this.themeRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getThemeById(id: string): Promise<Theme> {
    const theme = await this.themeRepository.findOne({ where: { id } });
    if (!theme) {
      throw new NotFoundException('Theme not found');
    }
    return theme;
  }

  async createTheme(dto: CreateThemeDto): Promise<Theme> {
    // If this is set as active, deactivate all others
    if (dto.isActive) {
      await this.themeRepository.update({ isActive: true }, { isActive: false });
    }

    const theme = this.themeRepository.create(dto);
    return this.themeRepository.save(theme);
  }

  async updateTheme(id: string, dto: UpdateThemeDto): Promise<Theme> {
    const theme = await this.getThemeById(id);

    // If this is set as active, deactivate all others
    if (dto.isActive) {
      const activeThemes = await this.themeRepository.find({
        where: { isActive: true },
      });
      for (const activeTheme of activeThemes) {
        if (activeTheme.id !== id) {
          activeTheme.isActive = false;
          await this.themeRepository.save(activeTheme);
        }
      }
    }

    Object.assign(theme, dto);
    return this.themeRepository.save(theme);
  }

  async setActiveTheme(id: string): Promise<Theme> {
    // Deactivate all themes
    await this.themeRepository.update({ isActive: true }, { isActive: false });

    // Activate the selected theme
    const theme = await this.getThemeById(id);
    theme.isActive = true;
    return this.themeRepository.save(theme);
  }

  async deleteTheme(id: string): Promise<void> {
    const theme = await this.getThemeById(id);
    if (theme.isActive) {
      throw new Error('Cannot delete active theme. Please activate another theme first.');
    }
    await this.themeRepository.remove(theme);
  }
}
