import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { DoctorSettings } from './entities/doctor-settings.entity';
import { User } from '../users/entities/user.entity';

describe('SettingsService (integration)', () => {
  let service: SettingsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          entities: [DoctorSettings, User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([DoctorSettings, User]),
      ],
      providers: [SettingsService],
    }).compile();

    service = module.get(SettingsService);
  });

  it('should update workingDays and set availableDays', async () => {
    const doctorId = 'doctor-123';

    await service.updateSettings(doctorId, {
      workingDays: [1, 2, 3, 4, 5],
    });

    const settings = await service.getSettings(doctorId);

    expect(settings.availableDays).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
    ]);
  });

  it('should not set availableDays if workingDays is not provided', async () => {
    const doctorId = 'doctor-456';

    await service.updateSettings(doctorId, {});

    const settings = await service.getSettings(doctorId);

    expect(settings.availableDays).toBeUndefined();
  });
});
