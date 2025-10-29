import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { NotificationType, Member } from '../types';
import { emailService } from './emailService';

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
    // Only notify active members (exclude archived, unavailable, and possible)
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
    // Only notify active members (exclude archived)
    const membersWithUid = qualifiedMembers.filter(m => m.uid && m.status !== 'Archived');
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

  // Notify officers when a new member is added
  async notifyNewMemberAdded(officers: Member[], newMemberName: string, newMemberId: string) {
    // Only notify active officers (exclude archived)
    const officerUids = officers.filter(o => o.uid && o.status !== 'Archived').map(o => o.uid!)
    if (officerUids.length === 0) return;
    await this.createNotificationsForUsers(
      officerUids,
      NotificationType.NewMemberAdded,
      'New Member Added',
      `${newMemberName} has been added to the club roster.`,
      { memberId: newMemberId }
    );
  }

  // Notify Toastmaster when a member is unassigned from a role
  async notifyToastmasterOfSelfUnassignment(
    toastmasterUid: string,
    toastmasterEmail: string,
    toastmasterName: string,
    clubName: string,
    memberName: string,
    role: string,
    meetingDate: string,
    scheduleId: string
  ) {
    // Send in-app notification
    await this.createNotification(
      toastmasterUid,
      NotificationType.MemberSelfUnassigned,
      'Role Unassignment Alert',
      `${memberName} has been unassigned from ${role} for the meeting on ${meetingDate}. Please help find a replacement member to fill this role.`,
      { scheduleId, meetingDate, role, memberName }
    );

    // Send email notification
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${clubName} - Role Unassignment Alert</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0; 
              padding: 0; 
              background-color: #f8f9fa;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: #ffffff;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #004165 0%, #002b45 100%);
              color: white; 
              text-align: center; 
              padding: 30px 20px;
            }
            .header h1 { 
              margin: 0; 
              font-size: 24px; 
              font-weight: 600;
            }
            .content { 
              padding: 40px 30px; 
              background-color: #ffffff;
            }
            .alert-box {
              background-color: #FEF3C7;
              border-left: 4px solid #F59E0B;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .alert-box strong {
              color: #92400E;
              display: block;
              margin-bottom: 8px;
            }
            .details {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .details-row {
              display: flex;
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .details-row:last-child {
              border-bottom: none;
            }
            .details-label {
              font-weight: 600;
              min-width: 140px;
              color: #4a5568;
            }
            .details-value {
              color: #2d3748;
            }
            .cta-button {
              display: inline-block;
              background-color: #004165;
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .footer { 
              text-align: center; 
              padding: 20px; 
              background-color: #f8f9fa; 
              color: #718096; 
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Role Unassignment Alert</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${clubName}</p>
            </div>
            <div class="content">
              <p>Hello ${toastmasterName},</p>
              
              <div class="alert-box">
                <strong>⚠️ Action Required</strong>
                A role needs to be filled for your upcoming meeting.
              </div>

              <p>A member has been unassigned from a role for your meeting. Please help coordinate finding a replacement.</p>

              <div class="details">
                <div class="details-row">
                  <span class="details-label">Member:</span>
                  <span class="details-value">${memberName}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Role:</span>
                  <span class="details-value">${role}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Meeting Date:</span>
                  <span class="details-value">${meetingDate}</span>
                </div>
              </div>

              <p><strong>What to do:</strong></p>
              <ul>
                <li>Check which members are available for this date</li>
                <li>Reach out to qualified members to fill the role</li>
                <li>Update the schedule once you find a replacement</li>
              </ul>

              <center>
                <a 
                  href="${typeof window !== 'undefined' ? window.location.origin : 'https://tmapp.club'}/#/schedule" 
                  class="cta-button"
                  style="display:inline-block;background-color:#004165;color:#ffffff !important;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0;"
                >
                  View Schedule
                </a>
              </center>

              <p style="margin-top: 30px; color: #718096; font-size: 14px;">
                This is an automated notification from the Toastmasters Monthly Scheduler.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${clubName}</p>
              <p style="margin-top: 10px; font-size: 12px;">
                Powered by Toastmasters Monthly Scheduler
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `
Role Unassignment Alert - ${clubName}

Hello ${toastmasterName},

⚠️ ACTION REQUIRED
A role needs to be filled for your upcoming meeting.

A member has been unassigned from a role for your meeting. Please help coordinate finding a replacement.

DETAILS:
- Member: ${memberName}
- Role: ${role}
- Meeting Date: ${meetingDate}

WHAT TO DO:
- Check which members are available for this date
- Reach out to qualified members to fill the role
- Update the schedule once you find a replacement

View the schedule: ${typeof window !== 'undefined' ? window.location.origin : 'https://tmapp.club'}/#/schedule

---
This is an automated notification from the Toastmasters Monthly Scheduler.
© ${new Date().getFullYear()} ${clubName}
      `.trim();

      await emailService['queueEmail']({
        to: [toastmasterEmail],
        subject: `${clubName} - Role Unassignment Alert for ${meetingDate}`,
        html: emailHtml,
        text: emailText,
        from: `${clubName} <noreply@toastmasters-scheduler.app>`,
        headers: {
          'X-Club-Name': clubName,
          'X-Email-Type': 'role-unassignment',
          'X-Priority': '2',
          'X-MSMail-Priority': 'High',
          'Importance': 'High'
        }
      });
    } catch (error) {
      console.error('Error sending email to Toastmaster:', error);
      // Don't throw - in-app notification already sent
    }
  }
}

export const notificationService = new NotificationService();
