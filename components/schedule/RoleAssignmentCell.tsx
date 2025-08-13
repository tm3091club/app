
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
        // For members (non-admins), show only the current user when trying to assign to unassigned roles
        if (currentUser?.role !== 'Admin' && !assignedMemberId) {
            const currentMember = availableMembers.find(m => m.uid === currentUser.uid);
            return currentMember ? [currentMember] : [];
        }

        // For admins or when editing existing assignments, use the original logic
        const requiredQualificationKey = {
            'Toastmaster': 'isToastmaster',
            'Table Topics Master': 'isTableTopicsMaster',
            'General Evaluator': 'isGeneralEvaluator',
            'Inspiration Award': 'isPastPresident'
        }[role] as keyof Member;

        if (requiredQualificationKey) {
            const qualifiedMembers = availableMembers.filter(m => m[requiredQualificationKey]);
            
            const currentlyAssignedMember = assignedMemberId ? availableMembers.find(m => m.id === assignedMemberId) : null;
            if (currentlyAssignedMember && !qualifiedMembers.some(m => m.id === currentlyAssignedMember.id)) {
                return [currentlyAssignedMember, ...qualifiedMembers];
            }
            return qualifiedMembers;
        }
        
        return availableMembers;
    }, [role, availableMembers, assignedMemberId, currentUser]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onAssignmentChange(meetingIndex, role, e.target.value || null);
    };

    const isUnassigned = !assignedMemberId;

    const baseClasses = "w-full rounded-md shadow-sm py-1.5 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-center transition-colors";
    const unassignedClasses = "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 font-semibold border-red-300 dark:border-red-700";
    const assignedClasses = "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600";

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
                const isCurrentUser = currentUser && member.uid === currentUser.uid;
                
                // Since we've already filtered the members list appropriately, no need for additional disabling
                const isDisabled = false;

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
