
export enum UserRole {
  Admin = 'Admin',
  Member = 'Member',
}

export enum OfficerRole {
  President = 'President',
  VicePresidentEducation = 'Vice President Education',
  VicePresidentMembership = 'Vice President Membership', 
  VicePresidentPublicRelations = 'Vice President Public Relations',
  Secretary = 'Secretary',
  Treasurer = 'Treasurer',
  SergeantAtArms = 'Sergeant at Arms'
}

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  officerRole?: OfficerRole; // New field for officer position
  ownerId?: string; // Links member to the club owner who manages them
}

export interface Organization {
    name: string;
    members: AppUser[];
    district: string;
    clubNumber: string;
    ownerId: string;
    meetingDay?: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
    autoNotificationDay?: number; // Day of month to send availability notifications (1-28)
    timezone?: string; // IANA timezone identifier (e.g., 'America/New_York', 'America/Los_Angeles')
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
  joinedDate?: string; // ISO date string when member joined
  ownerId?: string; // Links member to the club owner who manages them
  officerRole?: OfficerRole; // Officer position within the club
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
  memberId?: string; // Link to existing member if provided
  status?: 'pending' | 'completed';
  createdAt?: any; // Firestore timestamp
  completedAt?: any; // Firestore timestamp
  completedBy?: string; // UID of user who completed the invitation
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

export interface AgendaItem {
  id: string;
  time: string; // e.g., "7:00-7:03" or "7:00"
  programEvent: string; // e.g., "President calls meeting to order"
  person: string; // Name of member or free text
  description: string; // Description of role or task
  roleKey?: string; // Optional: if tied to a role, this is the role name from TOASTMASTERS_ROLES
  isManualOverride?: boolean; // True if user has manually overridden the auto-populated person
  rowColor?: 'normal' | 'highlight' | 'space'; // Manual row color selection
}

export interface WeeklyAgenda {
  id: string; // Format: "YYYY-MM-weekN" e.g., "2024-07-week1"
  scheduleId: string; // Reference to the monthly schedule ID
  meetingDate: string; // ISO date string
  theme: string;
  items: AgendaItem[];
  nextMeetingInfo?: {
    toastmaster: string;
    speakers: string[];
    tableTopicsMaster: string;
    isManualOverride?: boolean;
  };
  websiteUrl?: string; // Custom website URL
  createdAt?: Date;
  updatedAt?: Date;
  ownerId?: string;
  shareId?: string;
  isShared?: boolean;
}

export interface AgendaTemplate {
  items: Omit<AgendaItem, 'id'>[];
}
