import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorSettings } from './entities/doctor-settings.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(DoctorSettings)
    private readonly settingsRepository: Repository<DoctorSettings>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) { }

  async getSettings(doctorId: string): Promise<DoctorSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { doctorId },
      relations: ['doctor'],
    });

    if (!settings) {
      settings = this.settingsRepository.create({
        doctorId,
      });
      settings = await this.settingsRepository.save(settings);
    }

    return settings;
  }

  async updateSettings(doctorId: string, updateData: Partial<DoctorSettings & { workingDays?: number[] }>): Promise<DoctorSettings> {
    let settings = await this.getSettings(doctorId);

    // Calculate availableDays from workingDays if present
    if (updateData.workingDays && Array.isArray(updateData.workingDays)) {
      const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      updateData.availableDays = updateData.workingDays.map((d) => DAY_NAMES[d]);
    }

    Object.assign(settings, updateData);
    const savedSettings = await this.settingsRepository.save(settings);

    // Sync specific fields to User entity for consistency
    const userUpdate: Partial<User> = {};
    if (updateData.workingDays !== undefined) userUpdate.workingDays = updateData.workingDays;
    if (updateData.availableDays !== undefined) userUpdate.availableDays = updateData.availableDays;
    if (updateData.startTime !== undefined) userUpdate.startTime = updateData.startTime;
    if (updateData.endTime !== undefined) userUpdate.endTime = updateData.endTime;

    if (Object.keys(userUpdate).length > 0) {
      await this.usersRepository.update(doctorId, userUpdate);
    }

    return savedSettings;
  }

  async updateProfile(doctorId: string, profileData: Partial<User>): Promise<User> {
    const doctor = await this.usersRepository.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new Error('Doctor not found');
    }
    Object.assign(doctor, profileData);
    return this.usersRepository.save(doctor);
  }

  async getProfile(doctorId: string): Promise<User> {
    return this.usersRepository.findOne({ where: { id: doctorId } });
  }
}
