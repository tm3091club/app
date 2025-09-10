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
export function getMeetingDatesForMonth(year: number, month: number, meetingDay: number): Date[] {
  const dates: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Find the first meeting day of the month
  let currentDate = new Date(firstDay);
  while (currentDate.getDay() !== meetingDay) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Add all meeting days for the month
  while (currentDate <= lastDay) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 7); // Next week
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
