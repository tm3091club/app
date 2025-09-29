import { MonthlySchedule } from '../types';

export interface MonthInfo {
  year: number;
  month: number; // 0-indexed
  displayName: string;
  isCurrentMonth: boolean;
  isNextMonth: boolean;
}

/**
 * Gets the current month info based on the meeting day and current date
 */
export function getCurrentMonthInfo(meetingDay: number = 2): MonthInfo {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  return {
    year: currentYear,
    month: currentMonth,
    displayName: new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' }),
    isCurrentMonth: true,
    isNextMonth: false
  };
}

/**
 * Gets the next month info for availability planning
 */
export function getNextMonthInfo(meetingDay: number = 2): MonthInfo {
  const now = new Date();
  let nextYear = now.getFullYear();
  let nextMonth = now.getMonth() + 1;
  
  // Handle year rollover
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear++;
  }
  
  return {
    year: nextYear,
    month: nextMonth,
    displayName: new Date(nextYear, nextMonth).toLocaleString('default', { month: 'long', year: 'numeric' }),
    isCurrentMonth: false,
    isNextMonth: true
  };
}

/**
 * Determines which month's availability should be shown based on current date and meeting day
 */
export function getRelevantMonthsForAvailability(meetingDay: number = 2): { current: MonthInfo; next: MonthInfo } {
  return {
    current: getCurrentMonthInfo(meetingDay),
    next: getNextMonthInfo(meetingDay)
  };
}

/**
 * Determines the next schedule month based on existing schedules and meeting day
 */
export function getNextScheduleMonth(existingSchedules: MonthlySchedule[], meetingDay: number = 2): MonthInfo {
  if (!Array.isArray(existingSchedules) || existingSchedules.length === 0) {
    return getCurrentMonthInfo(meetingDay);
  }
  
  // Find the latest schedule
  const latestSchedule = existingSchedules.reduce((latest, schedule) => {
    const latestDate = new Date(latest.year, latest.month);
    const scheduleDate = new Date(schedule.year, schedule.month);
    return scheduleDate > latestDate ? schedule : latest;
  });
  
  let nextYear = latestSchedule.year;
  let nextMonth = latestSchedule.month + 1;
  
  // Handle year rollover
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear++;
  }
  
  return {
    year: nextYear,
    month: nextMonth,
    displayName: new Date(nextYear, nextMonth).toLocaleString('default', { month: 'long', year: 'numeric' }),
    isCurrentMonth: false,
    isNextMonth: false
  };
}

/**
 * Gets all meeting dates for a given month and meeting day
 */
export function getMeetingDatesForMonth(year: number, month: number, meetingDay: number, timezone?: string): Date[] {
  const dates: Date[] = [];
  
  // Use the specified timezone or fall back to local timezone
  const targetTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Create the first day of the month in the target timezone
  const firstDayOfMonth = new Date(year, month, 1);
  
  // Find the first occurrence of the meeting day in the month
  let currentDate = new Date(firstDayOfMonth);
  
  // Get the day of week for the first day of the month
  const firstDayOfWeek = currentDate.getDay();
  
  // Calculate how many days to add to get to the first meeting day
  let daysToAdd = (meetingDay - firstDayOfWeek + 7) % 7;
  
  // Set to the first meeting day of the month
  currentDate.setDate(currentDate.getDate() + daysToAdd);
  
  // Add all meeting dates for the month
  while (currentDate.getMonth() === month) {
    // Create a new date object to avoid mutation
    const meetingDate = new Date(currentDate);
    dates.push(meetingDate);
    
    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  return dates;
}

/**
 * Checks if it's time to send availability notifications based on auto notification day
 */
export function shouldSendAvailabilityNotification(autoNotificationDay: number = 15): boolean {
  const today = new Date();
  return today.getDate() === autoNotificationDay;
}

/**
 * Gets the month key for availability (YYYY-MM format)
 */
export function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Determines the appropriate availability month to show by default.
 * Similar to schedule logic - if current month has remaining meetings, show current month.
 * Otherwise, show next month for planning ahead.
 */
export function getAppropriateAvailabilityMonth(meetingDay: number = 2): MonthInfo {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Get meeting dates for current month
  const currentMonthMeetings = getMeetingDatesForMonth(currentYear, currentMonth, meetingDay);
  
  // Check if current month has any future meetings
  const hasFutureMeetings = currentMonthMeetings.some(meetingDate => {
    return meetingDate >= currentDate;
  });
  
  if (hasFutureMeetings) {
    // Current month has remaining meetings, show current month
    return getCurrentMonthInfo(meetingDay);
  } else {
    // Current month has no remaining meetings, show next month for planning
    return getNextMonthInfo(meetingDay);
  }
}