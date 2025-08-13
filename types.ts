
export enum UserRole {
  Admin = 'Admin',
  Member = 'Member',
}

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Organization {
    name: string;
    members: AppUser[];
    district: string;
    clubNumber: string;
    ownerId: string;
    meetingDay?: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    autoNotificationDay?: number; // Day of month to send availability notifications (1-28)
}

export enum MemberStatus {
  Active = 'Active',
  Possible = 'Possible',
  Unavailable = 'Unavailable',
  Archived = 'Archived',
}

export enum AvailabilityStatus {
  Available = 'Available',
  Unavailable = 'Unavailable',
  Possible = 'Possible',
}

export interface Member {
  id: string;
  name: string;
  status: MemberStatus;
  isToastmaster?: boolean;
  isTableTopicsMaster?: boolean;
  isGeneralEvaluator?: boolean;
  isPastPresident?: boolean;
  uid?: string; // Link to the user account
}

export interface MemberAvailability {
  [meetingDateISO: string]: AvailabilityStatus;
}

export interface RoleAssignment {
  [role: string]: string | null; // memberId or null if unassigned
}

export interface Meeting {
  date: string; // ISO string for the meeting date
  theme: string;
  assignments: RoleAssignment;
  isBlackout?: boolean;
}

export interface MonthlySchedule {
  id: string; // e.g., "2024-07"
  year: number;
  month: number; // 0-indexed
  meetings: Meeting[];
  shareId?: string;
  isShared?: boolean;
  ownerId?: string; // UID of the user who shared the schedule
}

export interface PendingInvite {
  id: string; // Document ID (the unique token)
  email: string;
  invitedUserName: string;
  ownerId: string;
}

export enum NotificationType {
  SchedulePublished = 'SchedulePublished',
  RoleReminder = 'RoleReminder',
  AvailabilityRequest = 'AvailabilityRequest',
  RoleChanged = 'RoleChanged',
  RoleUnassigned = 'RoleUnassigned',
  MeetingBlackout = 'MeetingBlackout',
  SpeakerUnassigned = 'SpeakerUnassigned',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
  isRead: boolean;
  isDismissed?: boolean;
  dismissedAt?: Date;
  metadata?: {
    scheduleId?: string;
    meetingDate?: string;
    role?: string;
    previousAssignee?: string;
    newAssignee?: string;
    evaluatorId?: string;
  };
}
