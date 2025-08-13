import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { NotificationType, Member, AppUser } from '../types';

class NotificationService {
  private notificationsCollection = collection(db, 'notifications');

  // Create a notification for a single user
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: any
  ) {
    try {
      await addDoc(this.notificationsCollection, {
        userId,
        type,
        title,
        message,
        createdAt: Timestamp.now(),
        isRead: false,
        metadata,
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Create notifications for multiple users
  async createNotificationsForUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    metadata?: any
  ) {
    const promises = userIds.map((userId) =>
      this.createNotification(userId, type, title, message, metadata)
    );
    await Promise.all(promises);
  }

  // Notify all members when a new schedule is published
  async notifySchedulePublished(
    members: Member[],
    scheduleId: string,
    monthYear: string
  ) {
    const membersWithUid = members.filter(m => m.uid && m.status === 'Active');
    const userIds = membersWithUid.map(m => m.uid!);

    await this.createNotificationsForUsers(
      userIds,
      NotificationType.SchedulePublished,
      'New Schedule Published',
      `The schedule for ${monthYear} has been published. Check your assignments!`,
      { scheduleId }
    );
  }

  // Send role reminder on Sunday
  async sendRoleReminders(scheduleId: string, meetingDate: string, assignments: Record<string, string | null>) {
    const assignedMembers = Object.entries(assignments)
      .filter(([_, memberId]) => memberId)
      .map(([role, memberId]) => ({ role, memberId: memberId! }));

    for (const { role, memberId } of assignedMembers) {
      // Get member details to find uid
      const membersSnapshot = await getDocs(
        query(collection(db, 'users'), where('members', 'array-contains', { id: memberId }))
      );
      
      if (!membersSnapshot.empty) {
        const memberData = membersSnapshot.docs[0].data().members.find((m: Member) => m.id === memberId);
        if (memberData?.uid) {
          await this.createNotification(
            memberData.uid,
            NotificationType.RoleReminder,
            'Role Reminder',
            `Reminder: You are assigned as ${role} for the meeting on ${meetingDate}`,
            { scheduleId, meetingDate, role }
          );
        }
      }
    }
  }

  // Notify about availability request
  async notifyAvailabilityRequest(members: Member[], monthYear: string) {
    const membersWithUid = members.filter(m => m.uid && m.status === 'Active');
    const userIds = membersWithUid.map(m => m.uid!);

    await this.createNotificationsForUsers(
      userIds,
      NotificationType.AvailabilityRequest,
      'Update Your Availability',
      `Please update your availability for ${monthYear} to help with schedule planning.`,
      {}
    );
  }

  // Notify when a role is changed
  async notifyRoleChanged(
    previousAssigneeUid: string | null,
    newAssigneeUid: string | null,
    role: string,
    meetingDate: string,
    scheduleId: string
  ) {
    // Notify previous assignee if exists
    if (previousAssigneeUid) {
      await this.createNotification(
        previousAssigneeUid,
        NotificationType.RoleChanged,
        'Role Assignment Changed',
        `You are no longer assigned as ${role} for the meeting on ${meetingDate}`,
        { scheduleId, meetingDate, role, previousAssignee: previousAssigneeUid }
      );
    }

    // Notify new assignee if exists
    if (newAssigneeUid) {
      await this.createNotification(
        newAssigneeUid,
        NotificationType.RoleChanged,
        'New Role Assignment',
        `You have been assigned as ${role} for the meeting on ${meetingDate}`,
        { scheduleId, meetingDate, role, newAssignee: newAssigneeUid }
      );
    }
  }

  // Notify available/possible members when a role becomes unassigned
  async notifyRoleUnassigned(
    qualifiedMembers: Member[],
    role: string,
    meetingDate: string,
    scheduleId: string
  ) {
    const membersWithUid = qualifiedMembers.filter(m => m.uid);
    const userIds = membersWithUid.map(m => m.uid!);

    await this.createNotificationsForUsers(
      userIds,
      NotificationType.RoleUnassigned,
      'Role Available',
      `The ${role} position for ${meetingDate} is now unassigned. You are qualified and available/possible for this role.`,
      { scheduleId, meetingDate, role }
    );
  }

  // Notify all members when a meeting is marked as blackout
  async notifyMeetingBlackout(
    members: Member[],
    meetingDate: string,
    scheduleId: string
  ) {
    const membersWithUid = members.filter(m => m.uid && m.status === 'Active');
    const userIds = membersWithUid.map(m => m.uid!);

    await this.createNotificationsForUsers(
      userIds,
      NotificationType.MeetingBlackout,
      'Meeting Cancelled',
      `The meeting scheduled for ${meetingDate} has been marked as blackout/cancelled.`,
      { scheduleId, meetingDate }
    );
  }

  // Notify evaluator when their speaker becomes unassigned
  async notifySpeakerUnassigned(
    evaluatorUid: string,
    speakerRole: string,
    meetingDate: string,
    scheduleId: string
  ) {
    await this.createNotification(
      evaluatorUid,
      NotificationType.SpeakerUnassigned,
      'Speaker Unassigned',
      `The ${speakerRole} you were assigned to evaluate on ${meetingDate} is now unassigned.`,
      { scheduleId, meetingDate, role: speakerRole }
    );
  }
}

export const notificationService = new NotificationService();
