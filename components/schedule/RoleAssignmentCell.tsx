
import React, { useMemo } from 'react';
import { Member, RoleAssignment } from '../../types';
import { MAJOR_ROLES } from '../../Constants';
import { useToastmasters } from '../../Context/ToastmastersContext';

export const RoleAssignmentCell: React.FC<{
  meetingIndex: number;
  role: string;
  assignedMemberId: string | null;
  availableMembers: Member[];
  onAssignmentChange: (meetingIndex: number, role: string, memberId: string | null) => void;
  allAssignmentsForMeeting: RoleAssignment;
  disabled: boolean;
}> = ({ meetingIndex, role, assignedMemberId, availableMembers, onAssignmentChange, allAssignmentsForMeeting, disabled }) => {
    const { currentUser } = useToastmasters();
    
    const membersForThisRole = useMemo(() => {
        // Get the required qualification for this role
        const requiredQualificationKey = {
            'Toastmaster': 'isToastmaster',
            'Table Topics Master': 'isTableTopicsMaster',
            'General Evaluator': 'isGeneralEvaluator',
            'Inspiration Award': 'isPastPresident'
        }[role] as keyof Member;

        // Get qualified members for this role
        const qualifiedMembers = requiredQualificationKey 
            ? availableMembers.filter(m => m[requiredQualificationKey])
            : availableMembers;

        // For members (non-admins), show only qualified members and currently assigned member
        if (currentUser?.role !== 'Admin') {
            const currentMember = currentUser?.uid ? availableMembers.find(m => m.uid === currentUser.uid) : null;
            if (!currentMember) return [];

            // Only show dropdown if role is unassigned OR if current user is assigned to this role
            const isCurrentUserAssigned = assignedMemberId === currentMember.id;
            const isRoleUnassigned = !assignedMemberId;
            
            if (!isRoleUnassigned && !isCurrentUserAssigned) {
                return []; // Don't show dropdown for other members' assignments
            }

            // Start with qualified members (including current user if qualified)
            const membersToShow = qualifiedMembers.filter(m => m.id === currentMember.id);

            // If someone else is currently assigned, also show them (but they'll be disabled in the options)
            if (assignedMemberId && assignedMemberId !== currentMember.id) {
                const assignedMember = availableMembers.find(m => m.id === assignedMemberId);
                if (assignedMember) {
                    membersToShow.unshift(assignedMember); // Add at the beginning
                }
            }

            return membersToShow;
        }

        // For admins, show all qualified members plus currently assigned member
        const currentlyAssignedMember = assignedMemberId ? availableMembers.find(m => m.id === assignedMemberId) : null;
        if (currentlyAssignedMember && !qualifiedMembers.some(m => m.id === currentlyAssignedMember.id)) {
            return [currentlyAssignedMember, ...qualifiedMembers];
        }
        return qualifiedMembers;
    }, [role, availableMembers, assignedMemberId, currentUser]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onAssignmentChange(meetingIndex, role, e.target.value || null);
    };

    const isUnassigned = !assignedMemberId;
    const assignedMember = assignedMemberId ? availableMembers.find(m => m.id === assignedMemberId) : null;

    const baseClasses = "w-full rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-center transition-colors";
    const unassignedClasses = "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 font-semibold border-red-300 dark:border-red-700";
    const assignedClasses = "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600";
    const readOnlyClasses = "bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300";

    // If disabled and has no edit permissions, show read-only display
    if (disabled && membersForThisRole.length === 0) {
        return (
            <div className={`${baseClasses} ${isUnassigned ? unassignedClasses : readOnlyClasses}`}>
                {isUnassigned ? '-- Unassigned --' : assignedMember?.name || '-- Unknown --'}
            </div>
        );
    }

    return (
        <select
            value={assignedMemberId || ''}
            onChange={handleChange}
            disabled={disabled}
            className={`${baseClasses} ${isUnassigned ? unassignedClasses : assignedClasses} ${disabled ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}`}
            aria-label={`Assign role for ${role}`}
        >
            <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-normal">-- Unassigned --</option>
            {membersForThisRole.map(member => {
                let displayText = member.name;
                
                if (member.id !== assignedMemberId) {
                    const assignedRolesForMember = Object.keys(allAssignmentsForMeeting).filter(
                        r => allAssignmentsForMeeting[r] === member.id
                    );
                    if (assignedRolesForMember.length > 0) {
                        displayText = `${member.name} (as ${assignedRolesForMember.join(', ')})`;
                    }
                }

                // Check if this is the current user
                const isCurrentUser = currentUser?.uid && member.uid === currentUser.uid;
                
                // For members (non-admins), only allow them to select themselves or unassign
                const isDisabled = currentUser?.role !== 'Admin' && !isCurrentUser;

                return (
                    <option 
                        key={member.id} 
                        value={member.id}
                        disabled={isDisabled}
                        className={`font-normal ${
                            isCurrentUser 
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 font-semibold' 
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        } ${isDisabled ? 'opacity-50' : ''}`}
                    >
                        {displayText}
                    </option>
                );
            })}
        </select>
    );
};
