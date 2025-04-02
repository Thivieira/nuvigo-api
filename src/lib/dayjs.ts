import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Set default timezone to Brazil (UTC-3)
dayjs.tz.setDefault('America/Sao_Paulo');

// Export configured dayjs instance
export default dayjs;

// Export common date formatting functions
export const formatDate = (date: string | Date, format = 'YYYY-MM-DD HH:mm:ss'): string => {
  return dayjs(date).format(format);
};

export const formatDateUTC = (date: string | Date, format = 'YYYY-MM-DD HH:mm:ss'): string => {
  return dayjs.utc(date).format(format);
};

export const getTimeOfDay = (hour: number): string => {
  console.log('Hour:', hour);
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
};

// Convert UTC time to local time (Brazil UTC-3)
export function utcToLocal(date: string | Date): Dayjs {
  console.log('Input date:', date);

  // Parse the UTC date and convert to Brazil timezone
  const localDate = dayjs.utc(date).tz(TIMEZONE.BRAZIL);

  console.log('UTC date:', dayjs.utc(date).format('YYYY-MM-DD HH:mm:ss'));
  console.log('Local date:', localDate.format('YYYY-MM-DD HH:mm:ss'));
  console.log('Local hour:', localDate.hour());

  return localDate;
}

// Export timezone constants
export const TIMEZONE = {
  BRAZIL: 'America/Sao_Paulo',
  UTC: 'UTC',
} as const; 