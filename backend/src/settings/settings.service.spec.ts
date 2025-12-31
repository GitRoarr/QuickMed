import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DoctorSettings } from './entities/doctor-settings.entity';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';

describe('SettingsService', () => {
  let service: SettingsService;
  let settingsRepo: Repository<DoctorSettings>;
  let usersRepo: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(DoctorSettings),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    settingsRepo = module.get<Repository<DoctorSettings>>(getRepositoryToken(DoctorSettings));
    usersRepo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should update workingDays and set availableDays', async () => {
    const doctorId = 'doctor-123';
    const workingDays = [1, 2, 3, 4, 5];
    const expectedAvailableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const settings = { doctorId } as DoctorSettings;

    jest.spyOn(service, 'getSettings').mockResolvedValue(settings);
    jest.spyOn(settingsRepo, 'save').mockImplementation(async (s) => s as any);

    const result = await service.updateSettings(doctorId, { workingDays });
    expect(result.availableDays).toEqual(expectedAvailableDays);
  });

  it('should not set availableDays if workingDays is not provided', async () => {
    const doctorId = 'doctor-123';
    const settings = { doctorId } as DoctorSettings;

    jest.spyOn(service, 'getSettings').mockResolvedValue(settings);
    jest.spyOn(settingsRepo, 'save').mockImplementation(async (s) => s as any);

    const result = await service.updateSettings(doctorId, {});
    expect(result.availableDays).toBeUndefined();
  });
});
