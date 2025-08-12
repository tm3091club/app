
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
