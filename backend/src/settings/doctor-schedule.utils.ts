export function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function alignToNextSlot(min: number, slotDuration: number): number {
  return Math.ceil(min / slotDuration) * slotDuration;
}

export function adjustWorkingRangeForToday(
  startTime: string,
  endTime: string,
  slotDuration: number,
  now: Date = new Date(),
  gracePeriod = 0
): [number, number] | null {
  const start = timeStringToMinutes(startTime);
  const end = timeStringToMinutes(endTime);

  const nowMinutes =
    now.getHours() * 60 + now.getMinutes() + gracePeriod;

  if (nowMinutes >= end) return null;

  const adjustedStart =
    nowMinutes > start
      ? alignToNextSlot(nowMinutes, slotDuration)
      : start;

  if (adjustedStart >= end) return null;

  return [adjustedStart, end];
}

export function generateTimeSlots(
  startMinutes: number,
  endMinutes: number,
  slotDuration: number
): { start: string; end: string }[] {
  const slots = [];

  for (
    let t = startMinutes;
    t + slotDuration <= endMinutes;
    t += slotDuration
  ) {
    slots.push({
      start: minutesToTimeString(t),
      end: minutesToTimeString(t + slotDuration),
    });
  }

  return slots;
}

export function getAvailableSlotsForDate(
  date: Date,
  startTime: string,
  endTime: string,
  slotDuration: number,
  gracePeriod = 0
): { start: string; end: string }[] {
  const today = new Date();

  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  let startMinutes = timeStringToMinutes(startTime);
  const endMinutes = timeStringToMinutes(endTime);

  if (startMinutes >= endMinutes) return [];

  if (isToday) {
    const adjusted = adjustWorkingRangeForToday(
      startTime,
      endTime,
      slotDuration,
      today,
      gracePeriod
    );
    if (!adjusted) return [];
    [startMinutes] = adjusted;
  }

  return generateTimeSlots(startMinutes, endMinutes, slotDuration);
}
