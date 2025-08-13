import React, { useState } from 'react';
import { BellRing, Calendar, Users, Mail } from 'lucide-react';
import { useToastmasters } from '../Context/ToastmastersContext';
import { notificationService } from '../services/notificationService';
import { emailService } from '../services/emailService';
import { AvailabilityStatus, MemberStatus } from '../types';
import { getNextMonthInfo, shouldSendAvailabilityNotification } from '../utils/monthUtils';

const NotificationScheduler: React.FC = () => {
  const { members, schedules, availability, currentUser, organization } = useToastmasters();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Only show for admins
  if (currentUser?.role !== 'Admin') {
    return null;
  }

  const sendRoleReminders = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const meetingDay = organization?.meetingDay ?? 2; // Default to Tuesday
      
      // Get next meeting day's date
      const today = new Date();
      const daysUntilMeeting = (meetingDay - today.getDay() + 7) % 7 || 7;
      const nextMeetingDate = new Date(today);
      nextMeetingDate.setDate(today.getDate() + daysUntilMeeting);
      const nextMeetingStr = nextMeetingDate.toISOString().split('T')[0];

      // Find schedule for next meeting
      const activeSchedule = schedules.find(schedule => {
        return schedule.meetings.some(meeting => 
          meeting.date.split('T')[0] === nextMeetingStr
        );
      });

      if (!activeSchedule) {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][meetingDay];
        setMessage({ type: 'error', text: `No schedule found for next ${dayName}` });
        setLoading(false);
        return;
      }

      const meeting = activeSchedule.meetings.find(m => 
        m.date.split('T')[0] === nextMeetingStr
      );

      if (!meeting || meeting.isBlackout) {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][meetingDay];
        setMessage({ type: 'error', text: `Next ${dayName} is marked as blackout or not found` });
        setLoading(false);
        return;
      }

      // Send reminders for all assigned roles
      await notificationService.sendRoleReminders(
        activeSchedule.id,
        nextMeetingDate.toLocaleDateString(),
        meeting.assignments
      );

      setMessage({ type: 'success', text: 'Role reminders sent successfully!' });
    } catch (error) {
      console.error('Error sending role reminders:', error);
      setMessage({ type: 'error', text: 'Failed to send role reminders' });
    } finally {
      setLoading(false);
    }
  };

  const sendAvailabilityRequests = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const meetingDay = organization?.meetingDay ?? 2; // Default to Tuesday
      const nextMonthInfo = getNextMonthInfo(meetingDay);
      
      // Get active members with UIDs for notifications (from Member objects)
      const activeMembers = members.filter(m => 
        m.status === MemberStatus.Active && m.uid
      );

      // Send in-app notifications
      await notificationService.notifyAvailabilityRequest(activeMembers, nextMonthInfo.displayName);

      // Get email recipients from organization members (AppUser objects) - this is what shows in Team Management
      const clubOwnerId = organization?.ownerId;
      const emailRecipients = organization?.members.filter(m => 
        m.email && 
        m.email.trim() !== '' &&
        m.uid !== clubOwnerId // Exclude club owner (the person who created the club)
      ).map(m => ({
        email: m.email,
        name: m.name
      })) || [];

      if (emailRecipients.length > 0 && organization) {
        // Get meeting day name
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const meetingDayName = dayNames[meetingDay];

        // Send emails
        await emailService.sendAvailabilityRequest(
          emailRecipients,
          organization.name,
          nextMonthInfo.displayName,
          nextMonthInfo.year,
          meetingDayName
        );

        setMessage({ 
          type: 'success', 
          text: `Availability requests sent! ${activeMembers.length} in-app notifications and ${emailRecipients.length} emails queued.` 
        });
      } else {
        setMessage({ 
          type: 'success', 
          text: `Availability requests sent! ${activeMembers.length} in-app notifications sent. No email recipients found.` 
        });
      }
    } catch (error) {
      console.error('Error sending availability requests:', error);
      setMessage({ type: 'error', text: 'Failed to send availability requests' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">
        Notification Actions
      </h3>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={sendRoleReminders}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BellRing className="h-5 w-5" />
            Send Role Reminders (Next {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][organization?.meetingDay ?? 2]})
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Send reminders to all members assigned to roles for next {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][organization?.meetingDay ?? 2]}
          </p>
        </div>

        <div>
          <button
            onClick={sendAvailabilityRequests}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-1">
              <Calendar className="h-5 w-5" />
              <Mail className="h-4 w-4" />
            </div>
            Request Availability ({getNextMonthInfo(organization?.meetingDay ?? 2).displayName})
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Send a notification and email all members to update their availability for {getNextMonthInfo(organization?.meetingDay ?? 2).displayName}
          </p>
        </div>
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default NotificationScheduler;
