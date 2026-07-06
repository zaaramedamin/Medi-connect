import { TimeSlot } from '../types';

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  date: string
): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  for (let minutes = startTotal; minutes + durationMinutes <= endTotal; minutes += durationMinutes) {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    slots.push(`${date}T${h}:${m}:00`);
  }

  return slots;
}

export function buildAvailableSlots(
  allSlots: string[],
  bookedSlots: string[],
  blockedRanges: Array<{ start_time: string; end_time: string }>
): TimeSlot[] {
  const bookedSet = new Set(bookedSlots.map(s => new Date(s).toISOString()));

  return allSlots.map(slot => {
    const slotDate = new Date(slot);
    const isBooked = bookedSet.has(slotDate.toISOString());
    const isBlocked = blockedRanges.some(range => {
      const start = new Date(range.start_time);
      const end = new Date(range.end_time);
      return slotDate >= start && slotDate < end;
    });

    return {
      time: slot,
      available: !isBooked && !isBlocked,
    };
  });
}
