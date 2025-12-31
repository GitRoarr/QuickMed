import { Test, TestingModule } from '@nestjs/testing';
import { DoctorScheduleService } from './doctor-schedule.service';

describe('DoctorScheduleService', () => {
  let service: DoctorScheduleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DoctorScheduleService],
    }).compile();
    service = module.get<DoctorScheduleService>(DoctorScheduleService);
  });

  it('should generate full day slots for a future date', () => {
    const date = new Date();
    date.setDate(date.getDate() + 1); // tomorrow
    const slots = service.getSlots(date, '09:00', '12:00', 30);
    expect(slots).toEqual([
      { start: '09:00', end: '09:30' },
      { start: '09:30', end: '10:00' },
      { start: '10:00', end: '10:30' },
      { start: '10:30', end: '11:00' },
      { start: '11:00', end: '11:30' },
      { start: '11:30', end: '12:00' },
    ]);
  });

  it('should trim past slots for today', () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    // Set working hours to now-1h to now+2h
    const start = `${(hour - 1).toString().padStart(2, '0')}:00`;
    const end = `${(hour + 2).toString().padStart(2, '0')}:00`;
    const slots = service.getSlots(now, start, end, 30);
    // All slots should start after now
    expect(slots.every(slot => {
      const [h, m] = slot.start.split(':').map(Number);
      return h > hour || (h === hour && m > minute);
    })).toBe(true);
  });

  it('should return no slots if now >= endTime', () => {
    const now = new Date();
    const hour = now.getHours();
    const end = `${(hour - 1).toString().padStart(2, '0')}:00`;
    const slots = service.getSlots(now, end, end, 30);
    expect(slots).toEqual([]);
  });

  it('should respect grace period', () => {
    const now = new Date();
    const hour = now.getHours();
    const start = `${hour.toString().padStart(2, '0')}:00`;
    const end = `${(hour + 2).toString().padStart(2, '0')}:00`;
    const slotsNoGrace = service.getSlots(now, start, end, 30, 0);
    const slotsWithGrace = service.getSlots(now, start, end, 30, 15);
    expect(slotsWithGrace.length).toBeLessThanOrEqual(slotsNoGrace.length);
  });
});
