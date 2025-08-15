

import React from 'react';
import { MonthlySchedule, Meeting, Member, AvailabilityStatus, MemberAvailability } from '../../types';
import { TOASTMASTERS_ROLES } from '../../Constants';
import { RoleAssignmentCell } from './RoleAssignmentCell';

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
}

const ReadOnlyRoleCell: React.FC<{ name: string | null }> = ({ name }) => (
    <div className="w-full text-center py-1.5 px-2 text-sm text-gray-500 dark:text-gray-400 h-[39px] flex items-center justify-center truncate">
        {name || <span className="italic">Unassigned</span>}
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
}) => {
  
  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg printable-schedule-container">
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th scope="col" className="sticky left-0 bg-gray-50 dark:bg-gray-700/50 p-4 text-left text-sm font-semibold text-gray-900 dark:text-white w-48 z-10">Role</th>
            {previousScheduleToShow?.map((meeting, index) => (
                <th key={`prev-${index}`} scope="col" className="p-4 text-center text-sm font-semibold text-gray-900 dark:text-white min-w-[200px] bg-blue-50 dark:bg-blue-900/30">
                    <span className="block italic text-blue-800 dark:text-blue-300">Previous Month</span>
                    {new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                </th>
            ))}
            {activeSchedule.meetings.map((meeting, index) => (
              <th key={index} scope="col" className="p-4 text-center text-sm font-semibold text-gray-900 dark:text-white min-w-[200px]">
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
            <th scope="col" className="sticky left-0 bg-gray-100 dark:bg-gray-700 p-4 text-left text-sm font-semibold text-gray-900 dark:text-white z-10">Theme</th>
             {previousScheduleToShow?.map((meeting, index) => (
                <td key={`prev-theme-${index}`} className="p-2 align-top bg-blue-100 dark:bg-blue-900/50">
                    <div className="w-full text-center py-1.5 px-2 text-sm text-gray-600 dark:text-gray-300 italic truncate h-[39px] flex items-center justify-center">
                        {meeting.theme}
                    </div>
                </td>
             ))}
            {activeSchedule.meetings.map((meeting, index) => (
              <td key={index} className={`p-2 align-top bg-gray-100 dark:bg-gray-700 ${meeting.isBlackout ? 'bg-gray-200 dark:bg-gray-800' : ''}`}>
                  <input
                    type="text"
                    value={meeting.theme}
                    onChange={(e) => onThemeChange(index, e.target.value)}
                    disabled={!canEditTheme(index) || !!meeting.isBlackout}
                    className="w-full bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-center disabled:bg-gray-200 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                    placeholder="Enter meeting theme"
                  />
              </td>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {TOASTMASTERS_ROLES.map(role => (
            <tr key={role} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td className="sticky left-0 bg-white dark:bg-gray-800 p-4 text-sm font-medium text-gray-900 dark:text-gray-200 whitespace-nowrap z-10">{role}</td>
              {previousScheduleToShow?.map((meeting, index) => (
                <td key={`prev-role-${index}`} className="p-2 align-top bg-blue-50 dark:bg-blue-900/20">
                    <ReadOnlyRoleCell name={getMemberName(meeting.assignments[role])} />
                </td>
              ))}
              {activeSchedule.meetings.map((meeting, index) => {
                  const membersAvailableForMeeting = activeMembers.filter(member => {
                      const dateKey = meeting.date.split('T')[0];
                      const memberAvailability = availability[member.id]?.[dateKey];
                      return memberAvailability !== AvailabilityStatus.Unavailable && memberAvailability !== AvailabilityStatus.Possible;
                  });

                  return (
                    <td key={index} className={`p-2 align-top ${meeting.isBlackout ? 'bg-gray-100 dark:bg-gray-900/50' : ''}`}>
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
                          />
                      )}
                    </td>
                  )
              })}
            </tr>
          ))}
          <tr className="bg-gray-50 dark:bg-gray-900/50 print-hide">
            <td className="sticky left-0 bg-gray-50 dark:bg-gray-900/50 p-4 text-sm font-semibold text-gray-900 dark:text-white z-10">Availability</td>
            {previousScheduleToShow?.map((_, index) => (
                <td key={`prev-avail-${index}`} className="p-2 align-top bg-blue-50 dark:bg-blue-900/20">
                     <div className="p-3 rounded-lg text-center">
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 opacity-50">N/A</h4>
                    </div>
                </td>
            ))}
            {activeSchedule.meetings.map((meeting, index) => (
              <td key={index} className="p-2 align-top">
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