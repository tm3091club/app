import { MonthlySchedule, Meeting, Member, Organization } from '../types';

export interface AdminTransitionInfo {
  currentWeekToastmaster: string | null;
  nextWeekToastmaster: string | null;
  isCurrentWeekActive: boolean;
  isNextWeekActive: boolean;
  currentWeekIndex: number;
  nextWeekIndex: number;
  meetingDay: number;
  timezone: string;
}

export interface ToastmasterAdminStatus {
  hasAdminRights: boolean;
  reason: 'permanent_admin' | 'current_week_toastmaster' | 'next_week_toastmaster' | 'no_rights';
  weekInfo?: {
    weekIndex: number;
    meetingDate: string;
    isCurrentWeek: boolean;
    isNextWeek: boolean;
  };
}

/**
 * Determines the current week index based on meeting dates and current time
 */
export function getCurrentWeekIndex(schedule: MonthlySchedule, meetingDay: number, timezone: string): number {
  if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
    return -1;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
  
  // Find the meeting that is today or the most recent past meeting
  let currentWeekIndex = -1;
  
  for (let i = 0; i < schedule.meetings.length; i++) {
    const meeting = schedule.meetings[i];
    if (!meeting.date) continue;
    
    const meetingDate = new Date(meeting.date + 'T00:00:00');
    if (isNaN(meetingDate.getTime())) continue;
    
    const meetingDayOnly = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());
    
    // If meeting is today, this is definitely the current week
    if (meetingDayOnly.getTime() === today.getTime()) {
      return i;
    }
    
    // If meeting is in the past, keep track of it as potential current week
    if (meetingDayOnly < today) {
      currentWeekIndex = i;
    }
  }
  
  // If we found a past meeting, that's the current week
  if (currentWeekIndex >= 0) {
    return currentWeekIndex;
  }
  
  // If no past meetings found, return -1 (no current week)
  return -1;
}

/**
 * Determines the next week index
 */
export function getNextWeekIndex(schedule: MonthlySchedule, currentWeekIndex: number): number {
  if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
    return -1;
  }
  
  // If no current week found, find the first future meeting
  if (currentWeekIndex === -1) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (let i = 0; i < schedule.meetings.length; i++) {
      const meeting = schedule.meetings[i];
      if (!meeting.date) continue;
      
      const meetingDate = new Date(meeting.date + 'T00:00:00');
      if (isNaN(meetingDate.getTime())) continue;
      
      const meetingDayOnly = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());
      
      // If meeting is in the future, this is the next week
      if (meetingDayOnly > today) {
        return i;
      }
    }
    return -1;
  }
  
  const nextIndex = currentWeekIndex + 1;
  return nextIndex < schedule.meetings.length ? nextIndex : -1;
}

/**
 * Gets the Toastmaster for a specific week
 */
export function getToastmasterForWeek(schedule: MonthlySchedule, weekIndex: number): string | null {
  if (!schedule || !schedule.meetings || weekIndex < 0 || weekIndex >= schedule.meetings.length) {
    return null;
  }
  
  const meeting = schedule.meetings[weekIndex];
  return meeting?.assignments?.['Toastmaster'] || null;
}

/**
 * Determines if a week is currently active (meeting hasn't passed yet)
 */
export function isWeekActive(schedule: MonthlySchedule, weekIndex: number): boolean {
  if (!schedule || !schedule.meetings || weekIndex < 0 || weekIndex >= schedule.meetings.length) {
    return false;
  }
  
  const meeting = schedule.meetings[weekIndex];
  if (!meeting.date) return false;
  
  const meetingDate = new Date(meeting.date + 'T00:00:00');
  if (isNaN(meetingDate.getTime())) return false;
  
  const now = new Date();
  
  // Week is active if the meeting date is today or in the future
  return meetingDate >= now;
}

/**
 * Determines if a week should have admin rights for Toastmaster
 * This is different from isWeekActive - it includes the transition period
 */
export function shouldWeekHaveAdminRights(schedule: MonthlySchedule, weekIndex: number, isNextWeek: boolean = false): boolean {
  if (!schedule || !schedule.meetings || weekIndex < 0 || weekIndex >= schedule.meetings.length) {
    return false;
  }
  
  const meeting = schedule.meetings[weekIndex];
  if (!meeting.date) return false;
  
  const meetingDate = new Date(meeting.date + 'T00:00:00');
  if (isNaN(meetingDate.getTime())) return false;
  
  const now = new Date();
  
  
  if (isNextWeek) {
    // For next week: admin rights start immediately after the current week's meeting ends
    // We need to find the previous week's meeting to determine when to activate
    if (weekIndex > 0) {
      const previousMeeting = schedule.meetings[weekIndex - 1];
      if (previousMeeting.date) {
        const previousMeetingDate = new Date(previousMeeting.date + 'T23:59:59'); // End of previous meeting day
        return now > previousMeetingDate;
      }
    }
    // If no previous meeting, use the meeting date itself
    return meetingDate >= now;
  } else {
    // For current week: admin rights until the meeting passes
    // If it's the meeting day, give admin rights until end of day
    const meetingDayOnly = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfMeetingDay = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate(), 23, 59, 59);
    
    // If it's the meeting day, admin rights until end of day
    if (meetingDayOnly.getTime() === today.getTime()) {
      return true;
    }
    
    // If meeting is in the future, admin rights
    if (meetingDate > now) {
      return true;
    }
    
    // If meeting is in the past, no admin rights
    return false;
  }
}

/**
 * Gets comprehensive admin transition information
 */
export function getAdminTransitionInfo(
  schedule: MonthlySchedule, 
  meetingDay: number, 
  timezone: string
): AdminTransitionInfo {
  const currentWeekIndex = getCurrentWeekIndex(schedule, meetingDay, timezone);
  const nextWeekIndex = getNextWeekIndex(schedule, currentWeekIndex);
  
  const currentWeekToastmaster = getToastmasterForWeek(schedule, currentWeekIndex);
  const nextWeekToastmaster = getToastmasterForWeek(schedule, nextWeekIndex);
  
  const isCurrentWeekActive = shouldWeekHaveAdminRights(schedule, currentWeekIndex, false);
  const isNextWeekActive = shouldWeekHaveAdminRights(schedule, nextWeekIndex, true);
  
  
  return {
    currentWeekToastmaster,
    nextWeekToastmaster,
    isCurrentWeekActive,
    isNextWeekActive,
    currentWeekIndex,
    nextWeekIndex,
    meetingDay,
    timezone
  };
}

/**
 * Determines if a user has admin rights based on their role and Toastmaster status
 */
export function getUserAdminStatus(
  userId: string,
  userRole: string,
  schedule: MonthlySchedule,
  organization: Organization,
  members: Member[],
  meetingDay: number,
  timezone: string
): ToastmasterAdminStatus {
  // Permanent admins always have admin rights
  if (userRole === 'Admin') {
    return {
      hasAdminRights: true,
      reason: 'permanent_admin'
    };
  }
  
  // Get transition info
  const transitionInfo = getAdminTransitionInfo(schedule, meetingDay, timezone);
  
  // Find the member profile for this user by looking in the members array
  // We need to find the member ID that corresponds to this user's UID
  const memberProfile = members?.find(m => m.uid === userId);
  if (!memberProfile) {
    
    // Let's also check if the user might be in organization.members instead
    const orgMemberProfile = organization?.members?.find(m => m.uid === userId);
    if (orgMemberProfile) {
      // Use the Firestore document ID from organization.members
      const memberId = orgMemberProfile.uid;
      const memberDocId = (orgMemberProfile as any).id || orgMemberProfile.uid; // Use Firestore ID from org.members
      
      
      
      // Check if user is Toastmaster for current week
      if ((transitionInfo.currentWeekToastmaster === memberId || transitionInfo.currentWeekToastmaster === memberDocId) && transitionInfo.isCurrentWeekActive) {
        return {
          hasAdminRights: true,
          reason: 'current_week_toastmaster',
          weekInfo: {
            weekIndex: transitionInfo.currentWeekIndex,
            meetingDate: schedule.meetings[transitionInfo.currentWeekIndex]?.date || '',
            isCurrentWeek: true,
            isNextWeek: false
          }
        };
      }
      
      // Check if user is Toastmaster for next week
      if ((transitionInfo.nextWeekToastmaster === memberId || transitionInfo.nextWeekToastmaster === memberDocId) && transitionInfo.isNextWeekActive) {
        return {
          hasAdminRights: true,
          reason: 'next_week_toastmaster',
          weekInfo: {
            weekIndex: transitionInfo.nextWeekIndex,
            meetingDate: schedule.meetings[transitionInfo.nextWeekIndex]?.date || '',
            isCurrentWeek: false,
            isNextWeek: true
          }
        };
      }
    }
    
    return {
      hasAdminRights: false,
      reason: 'no_rights'
    };
  }
  
  // The member ID could be either the Firestore document ID or the UID
  // We need to check both for compatibility
  const memberId = memberProfile.uid;
  const memberDocId = memberProfile.id;
  
  console.log('👤 User Admin Check:', {
    userId,
    memberId,
    memberDocId,
    memberName: memberProfile.name,
    currentWeekToastmaster: transitionInfo.currentWeekToastmaster,
    nextWeekToastmaster: transitionInfo.nextWeekToastmaster,
    isCurrentWeekActive: transitionInfo.isCurrentWeekActive,
    isNextWeekActive: transitionInfo.isNextWeekActive
  });
  
  // Check if user is Toastmaster for current week
  if ((transitionInfo.currentWeekToastmaster === memberId || transitionInfo.currentWeekToastmaster === memberDocId) && transitionInfo.isCurrentWeekActive) {
    return {
      hasAdminRights: true,
      reason: 'current_week_toastmaster',
      weekInfo: {
        weekIndex: transitionInfo.currentWeekIndex,
        meetingDate: schedule.meetings[transitionInfo.currentWeekIndex]?.date || '',
        isCurrentWeek: true,
        isNextWeek: false
      }
    };
  }
  
  // Check if user is Toastmaster for next week
  if ((transitionInfo.nextWeekToastmaster === memberId || transitionInfo.nextWeekToastmaster === memberDocId) && transitionInfo.isNextWeekActive) {
    return {
      hasAdminRights: true,
      reason: 'next_week_toastmaster',
      weekInfo: {
        weekIndex: transitionInfo.nextWeekIndex,
        meetingDate: schedule.meetings[transitionInfo.nextWeekIndex]?.date || '',
        isCurrentWeek: false,
        isNextWeek: true
      }
    };
  }
  
  return {
    hasAdminRights: false,
    reason: 'no_rights'
  };
}

/**
 * Checks if a user can change Toastmaster assignments (with buffer protection)
 */
export function canChangeToastmasterAssignment(
  userId: string,
  userRole: string,
  schedule: MonthlySchedule,
  organization: Organization,
  meetingDay: number,
  timezone: string,
  targetWeekIndex: number
): { canChange: boolean; reason: string } {
  // Permanent admins can always change assignments
  if (userRole === 'Admin') {
    return { canChange: true, reason: 'permanent_admin' };
  }
  
  // Get transition info
  const transitionInfo = getAdminTransitionInfo(schedule, meetingDay, timezone);
  
  // Find the member profile for this user
  const member = organization?.members?.find(m => m.uid === userId);
  if (!member) {
    return { canChange: false, reason: 'user_not_found' };
  }
  
  // The member ID is the same as the UID for organization members
  const memberId = member.uid;
  
  // Check if user is Toastmaster for current week
  if (transitionInfo.currentWeekToastmaster === memberId && transitionInfo.isCurrentWeekActive) {
    // Current week Toastmaster can change assignments, but with buffer protection
    return { canChange: true, reason: 'current_week_toastmaster' };
  }
  
  // Check if user is Toastmaster for next week
  if (transitionInfo.nextWeekToastmaster === memberId && transitionInfo.isNextWeekActive) {
    // Next week Toastmaster can change assignments
    return { canChange: true, reason: 'next_week_toastmaster' };
  }
  
  return { canChange: false, reason: 'no_admin_rights' };
}

/**
 * Checks if a user can unassign themselves from Toastmaster role (buffer protection)
 */
export function canUnassignSelfFromToastmaster(
  userId: string,
  userRole: string,
  schedule: MonthlySchedule,
  organization: Organization,
  members: Member[],
  meetingDay: number,
  timezone: string,
  targetWeekIndex: number
): { canUnassign: boolean; reason: string; bufferTimeRemaining?: number } {
  // Permanent admins can always unassign
  if (userRole === 'Admin') {
    return { canUnassign: true, reason: 'permanent_admin' };
  }
  
  // Get transition info
  const transitionInfo = getAdminTransitionInfo(schedule, meetingDay, timezone);
  
  // Find the member profile for this user (try both arrays)
  let member = members?.find(m => m.uid === userId);
  if (!member) {
    // Try organization.members as fallback
    const orgMember = organization?.members?.find(m => m.uid === userId);
    if (orgMember) {
      // Create a mock member object from orgMember
      member = {
        id: orgMember.uid, // Use uid as id for AppUser
        uid: orgMember.uid,
        name: orgMember.name,
        status: 'Active' as any,
        isToastmaster: true // We know this user is trying to unassign from Toastmaster
      };
    }
  }
  
  if (!member) {
    return { canUnassign: false, reason: 'user_not_found' };
  }
  
  // The member ID could be either the Firestore document ID or the UID
  const memberId = member.uid;
  const memberDocId = member.id;
  
  
  // Check if user is Toastmaster for current week
  if ((transitionInfo.currentWeekToastmaster === memberId || transitionInfo.currentWeekToastmaster === memberDocId) && transitionInfo.isCurrentWeekActive) {
    const meeting = schedule.meetings[transitionInfo.currentWeekIndex];
    if (!meeting?.date) {
      return { canUnassign: false, reason: 'invalid_meeting_date' };
    }
    
    const meetingDate = new Date(meeting.date + 'T00:00:00');
    if (isNaN(meetingDate.getTime())) {
      return { canUnassign: false, reason: 'invalid_meeting_date' };
    }
    
    const now = new Date();
    const timeUntilMeeting = meetingDate.getTime() - now.getTime();
    const hoursUntilMeeting = timeUntilMeeting / (1000 * 60 * 60);
    
    // Buffer protection: Can't unassign within 24 hours of meeting
    if (hoursUntilMeeting < 24) {
      return { 
        canUnassign: false, 
        reason: 'buffer_protection_active',
        bufferTimeRemaining: Math.max(0, hoursUntilMeeting)
      };
    }
    
    return { canUnassign: true, reason: 'current_week_toastmaster' };
  }
  
  // Check if user is Toastmaster for next week
  if ((transitionInfo.nextWeekToastmaster === memberId || transitionInfo.nextWeekToastmaster === memberDocId) && transitionInfo.isNextWeekActive) {
    return { canUnassign: true, reason: 'next_week_toastmaster' };
  }
  
  // Check if user is Toastmaster for the specific target week they're trying to unassign from
  const targetMeeting = schedule.meetings[targetWeekIndex];
  if (targetMeeting && (targetMeeting.assignments?.Toastmaster === memberId || targetMeeting.assignments?.Toastmaster === memberDocId)) {
    // Check buffer protection for this specific meeting
    if (targetMeeting.date) {
      const meetingDate = new Date(targetMeeting.date + 'T00:00:00');
      if (!isNaN(meetingDate.getTime())) {
        const now = new Date();
        const timeUntilMeeting = meetingDate.getTime() - now.getTime();
        const hoursUntilMeeting = timeUntilMeeting / (1000 * 60 * 60);
        
        // Buffer protection: Can't unassign within 24 hours of meeting
        if (hoursUntilMeeting < 24 && hoursUntilMeeting > 0) {
          return { 
            canUnassign: false, 
            reason: 'buffer_protection_active',
            bufferTimeRemaining: Math.max(0, hoursUntilMeeting)
          };
        }
      }
    }
    return { canUnassign: true, reason: 'toastmaster_for_target_week' };
  }
  
  return { canUnassign: false, reason: 'no_admin_rights' };
}

/**
 * Gets a human-readable description of admin status
 */
export function getAdminStatusDescription(status: ToastmasterAdminStatus): string {
  switch (status.reason) {
    case 'permanent_admin':
      return 'Permanent Admin';
    case 'current_week_toastmaster':
      return `Current Week Toastmaster (Week ${(status.weekInfo?.weekIndex || 0) + 1})`;
    case 'next_week_toastmaster':
      return `Next Week Toastmaster (Week ${(status.weekInfo?.weekIndex || 0) + 1})`;
    case 'no_rights':
      return 'Regular Member';
    default:
      return 'Unknown Status';
  }
}
