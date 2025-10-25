

import React, { JSX, useRef, useEffect } from 'react';
import { MonthlySchedule, Meeting, Member, AvailabilityStatus, MemberAvailability } from '../../types';
// TOASTMASTERS_ROLES: All roles that appear on the monthly schedule. See Constants.ts for major/minor role definitions.
import { TOASTMASTERS_ROLES, ROLE_HIGHLIGHT_COLORS } from '../../Constants';
import { RoleAssignmentCell } from './RoleAssignmentCell';
import { getCurrentWeekIndex, getNextWeekIndex } from '../../utils/adminTransitionUtils';
import '../../styles/ScheduleHighlights.css';

interface ScheduleTableProps {
  activeSchedule: MonthlySchedule;
  previousScheduleToShow: Meeting[] | null;
  activeMembers: Member[];
  availability: { [memberId: string]: MemberAvailability };
  isEditable: boolean;
  onThemeChange: (meetingIndex: number, theme: string) => void;
  onToggleBlackout: (meetingIndex: number) => void;
  onAssignmentChange: (meetingIndex: number, role: string, memberId: string | null) => void;
  renderAvailabilityLists: (meeting: Meeting) => JSX.Element;
  getMemberName: (id: string | null) => string;
  // Granular permission functions
  canEditRoleAssignment: (meetingIndex: number, role: string) => boolean;
  canEditTheme: (meetingIndex: number) => boolean;
  canToggleBlackout: (meetingIndex: number) => boolean;
  // For auto-scrolling
  organization: { meetingDay: number; timezone: string };
}

const ReadOnlyRoleCell: React.FC<{ name: string | null; highlightColor?: string }> = ({ name, highlightColor }) => (
  <div className="w-full text-center py-1.5 px-1 sm:px-2 text-xs sm:text-sm h-[39px] flex items-center justify-center truncate">
    <span className="text-gray-600 dark:text-gray-200" data-dark-color={highlightColor}>
      {name || <span className="italic">Unassigned</span>}
    </span>
  </div>
);

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  activeSchedule,
  previousScheduleToShow,
  activeMembers,
  availability,
  isEditable,
  onThemeChange,
  onToggleBlackout,
  onAssignmentChange,
  renderAvailabilityLists,
  getMemberName,
  canEditRoleAssignment,
  canEditTheme,
  canToggleBlackout,
  organization,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current or next week on mobile
  useEffect(() => {
    const scrollToRelevantWeek = () => {
      if (!scrollContainerRef.current || !activeSchedule?.meetings) return;
      
  // Auto-scroll now works on all devices, including all mobile devices
      
      const currentWeekIndex = getCurrentWeekIndex(activeSchedule, organization.meetingDay, organization.timezone);
      const nextWeekIndex = getNextWeekIndex(activeSchedule, currentWeekIndex);
      
      // Determine which week to focus on
      let targetWeekIndex = currentWeekIndex;
      if (currentWeekIndex === -1 || !activeSchedule.meetings[currentWeekIndex]?.date) {
        // No current week found, use next week
        targetWeekIndex = nextWeekIndex;
      } else {
        // Check if current week's meeting has passed
        const currentMeeting = activeSchedule.meetings[currentWeekIndex];
        const meetingDate = new Date(currentMeeting.date + 'T23:59:59');
        const now = new Date();
        
        if (now > meetingDate) {
          // Current week meeting has passed, focus on next week
          targetWeekIndex = nextWeekIndex;
        }
      }
      
      if (targetWeekIndex === -1 || targetWeekIndex >= activeSchedule.meetings.length) return;
      
      // Calculate scroll position
      // Each column is approximately 130-250px wide (min-w-[130px] max-w-[250px])
      const columnWidth = 180; // Average width
      const previousMonthColumns = previousScheduleToShow?.length || 0;
  // Center the current week in the visible area
  const containerWidth = scrollContainerRef.current.offsetWidth || 0;
  const scrollPosition = (previousMonthColumns + targetWeekIndex) * columnWidth - (containerWidth / 2) + (columnWidth / 2);
      
      // Scroll to the target week with smooth animation
      scrollContainerRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    };
    
    // Add a small delay to ensure the table is fully rendered
    const timer = setTimeout(scrollToRelevantWeek, 100);
    
    return () => clearTimeout(timer);
  }, [activeSchedule, previousScheduleToShow, organization.meetingDay, organization.timezone]);
  
  return (
    <div 
      ref={scrollContainerRef}
      className="overflow-x-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg printable-schedule-container scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800"
    >
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th scope="col" className="sticky left-0 bg-gray-50 dark:bg-gray-700/50 p-2 sm:p-4 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-white min-w-[130px] max-w-[300px] z-10">Role</th>
            {previousScheduleToShow?.map((meeting, index) => (
                <th key={`prev-${index}`} scope="col" className="p-2 sm:p-4 text-center text-xs sm:text-sm font-semibold text-gray-900 dark:text-white min-w-[130px] max-w-[250px] bg-blue-50 dark:bg-blue-900/30">
                    <span className="block italic text-blue-800 dark:text-blue-300">Previous Month</span>
                    {new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                </th>
            ))}
            {activeSchedule.meetings.map((meeting, index) => (
              <th key={index} scope="col" className="p-2 sm:p-4 text-center text-xs sm:text-sm font-semibold text-gray-900 dark:text-white min-w-[130px] max-w-[250px]">
                {new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                <div className="mt-2 font-normal">
                    <label className={`flex items-center justify-center gap-2 text-xs ${!canToggleBlackout(index) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={!!meeting.isBlackout}
                        onChange={() => onToggleBlackout(index)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:pointer-events-none"
                        disabled={!canToggleBlackout(index)}
                      />
                      Blackout
                    </label>
                </div>
              </th>
            ))}
          </tr>
          <tr>
            <th scope="col" className="sticky left-0 bg-gray-100 dark:bg-gray-700 p-2 sm:p-4 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-white min-w-[130px] max-w-[300px] z-10">Theme</th>
             {previousScheduleToShow?.map((meeting, index) => (
                <td key={`prev-theme-${index}`} className="p-1 sm:p-2 align-top bg-blue-100 dark:bg-blue-900/50 min-w-[130px] max-w-[250px]">
                    <div className="w-full text-center py-1.5 px-1 sm:px-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 italic truncate h-[39px] flex items-center justify-center">
                        {meeting.theme}
                    </div>
                </td>
             ))}
            {activeSchedule.meetings.map((meeting, index) => (
              <td key={index} className={`p-2 align-top bg-gray-100 dark:bg-gray-700 min-w-[130px] max-w-[250px] ${meeting.isBlackout ? 'bg-gray-200 dark:bg-gray-800' : ''}`}>
                  <input
                    type="text"
                    value={meeting.theme}
                    onChange={(e) => onThemeChange(index, e.target.value)}
                    disabled={!canEditTheme(index) || !!meeting.isBlackout}
                    className="w-full bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-center disabled:bg-gray-200 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed truncate"
                    placeholder="Enter meeting theme"
                  />
              </td>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {TOASTMASTERS_ROLES.map(role => {
            // Determine highlight color for this role
            const highlightColor = ROLE_HIGHLIGHT_COLORS[role] || undefined;
            return (
              <tr key={role} className="role-row" data-highlight-color={highlightColor}>
                <td
                  className="sticky left-0 bg-white dark:bg-gray-800 p-2 sm:p-4 text-xs sm:text-sm font-medium text-gray-900 min-w-[130px] max-w-[300px] z-10 role-cell"
                  style={highlightColor ? { '--highlight-color': highlightColor } as React.CSSProperties : undefined}
                  data-role-highlight={highlightColor}
                >
                  <span className="dark:text-gray-200" data-dark-color={highlightColor}>
                    {role}
                  </span>
                </td>
                {previousScheduleToShow?.map((meeting, index) => (
                  <td key={`prev-role-${index}`} className="p-2 align-top bg-blue-50 dark:bg-blue-900/20 min-w-[130px] max-w-[250px]">
                      <ReadOnlyRoleCell name={getMemberName(meeting.assignments[role])} highlightColor={highlightColor} />
                  </td>
                ))}
        {activeSchedule.meetings.map((meeting, index) => {
          // For admins (isEditable=true), include all active members regardless of availability.
          // For non-admin/self-assign flows, restrict to Available only.
          const membersAvailableForMeeting = activeMembers.filter(member => {
            if (isEditable) return true;
            const dateKey = meeting.date.split('T')[0];
            const memberAvailability = availability[member.id]?.[dateKey];
            return memberAvailability !== AvailabilityStatus.Unavailable && memberAvailability !== AvailabilityStatus.Possible;
          });
                    return (
                      <td 
                        key={index} 
                        className={`p-1 sm:p-2 align-top hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150 min-w-[130px] max-w-[250px] member-cell ${meeting.isBlackout ? 'bg-gray-100 dark:bg-gray-900/50' : ''}`} 
                        style={!meeting.isBlackout && highlightColor ? { '--highlight-color': highlightColor } as React.CSSProperties : undefined}
                        data-cell-highlight={highlightColor}
                      >
                        {meeting.isBlackout ? (
                          <div className="w-full text-center py-1.5 px-2 text-sm text-gray-500 dark:text-gray-400 font-semibold italic h-[39px] flex items-center justify-center">
                            BLACKOUT
                          </div>
                        ) : (
                            <RoleAssignmentCell
                              meetingIndex={index}
                              role={role}
                              assignedMemberId={meeting.assignments[role]}
                              availableMembers={membersAvailableForMeeting}
                              onAssignmentChange={onAssignmentChange}
                              allAssignmentsForMeeting={meeting.assignments}
                              disabled={!canEditRoleAssignment(index, role)}
                              meetingDate={meeting.date}
                              availability={availability}
                              highlightColor={highlightColor}
                            />
                        )}
                      </td>
                    )
                })}
              </tr>
            );
          })}
          <tr className="bg-gray-50 dark:bg-gray-900/50 print-hide">
            <td className="sticky left-0 bg-gray-50 dark:bg-gray-900/50 p-2 sm:p-4 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white min-w-[130px] max-w-[300px] z-10">Availability</td>
            {previousScheduleToShow?.map((_, index) => (
                <td key={`prev-avail-${index}`} className="p-1 sm:p-2 align-top bg-blue-50 dark:bg-blue-900/20 min-w-[130px] max-w-[250px]">
                     <div className="p-2 sm:p-3 rounded-lg text-center">
                        <h4 className="text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-300 opacity-50">N/A</h4>
                    </div>
                </td>
            ))}
            {activeSchedule.meetings.map((meeting, index) => (
              <td key={index} className="p-1 sm:p-2 align-top min-w-[160px] max-w-[250px]">
                {meeting.isBlackout ? (
                  <div className="p-3 rounded-lg text-center bg-gray-200 dark:bg-gray-700">
                    <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400">BLACKOUT</h4>
                  </div>
                ) : (
                  renderAvailabilityLists(meeting)
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};