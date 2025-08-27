
import React, { useMemo } from 'react';
import { Member, RoleAssignment, AvailabilityStatus } from '../../types';
import { MAJOR_ROLES, TOASTMASTERS_ROLES } from '../../Constants';
import { useToastmasters } from '../../Context/ToastmastersContext';

export const RoleAssignmentCell: React.FC<{
  meetingIndex: number;
  role: string;
  assignedMemberId: string | null;
  availableMembers: Member[];
  onAssignmentChange: (meetingIndex: number, role: string, memberId: string | null) => void;
  allAssignmentsForMeeting: RoleAssignment;
  disabled: boolean;
  meetingDate: string;
  availability: { [memberId: string]: any };
}> = ({ meetingIndex, role, assignedMemberId, availableMembers, onAssignmentChange, allAssignmentsForMeeting, disabled, meetingDate, availability }) => {
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

        // For admins, order by current role hierarchy (Toastmaster first ... Inspiration Award last),
        // then members with no role; among no-role members, place "available" at the bottom
        const dateKey = meetingDate.split('T')[0];

        // Get all qualified members plus currently assigned member
        let allMembers = [...qualifiedMembers];
        const currentlyAssignedMember = assignedMemberId ? availableMembers.find(m => m.id === assignedMemberId) : null;
        if (currentlyAssignedMember && !qualifiedMembers.some(m => m.id === currentlyAssignedMember.id)) {
            allMembers.unshift(currentlyAssignedMember);
        }

        type MemberSortInfo = {
            member: Member;
            roleIndexes: number[]; // indexes of roles this member holds in this meeting
            hasAnyRole: boolean;
            isAvailableNoRole: boolean; // only relevant when hasAnyRole === false
        };

        const sortInfos: MemberSortInfo[] = allMembers.map(member => {
            const rolesInMeeting = Object.keys(allAssignmentsForMeeting).filter(r => allAssignmentsForMeeting[r] === member.id);
            const roleIndexes = rolesInMeeting.map(r => TOASTMASTERS_ROLES.indexOf(r)).filter(i => i >= 0);
            const hasAnyRole = roleIndexes.length > 0;

            const availStatus = availability[member.id]?.[dateKey];
            const isAvailable = availStatus === AvailabilityStatus.Available || availStatus === undefined;
            return {
                member,
                roleIndexes,
                hasAnyRole,
                isAvailableNoRole: !hasAnyRole && isAvailable,
            };
        });

        sortInfos.sort((a, b) => {
            // Members with roles come first, ordered by their earliest role index
            if (a.hasAnyRole && !b.hasAnyRole) return -1;
            if (!a.hasAnyRole && b.hasAnyRole) return 1;

            if (a.hasAnyRole && b.hasAnyRole) {
                const aIdx = Math.min(...a.roleIndexes);
                const bIdx = Math.min(...b.roleIndexes);
                if (aIdx !== bIdx) return aIdx - bIdx;
                return a.member.name.localeCompare(b.member.name);
            }

            // Neither has a role: push available members to the bottom
            if (a.isAvailableNoRole && !b.isAvailableNoRole) return 1;
            if (!a.isAvailableNoRole && b.isAvailableNoRole) return -1;
            return a.member.name.localeCompare(b.member.name);
        });

        return sortInfos.map(s => s.member);
    }, [role, availableMembers, assignedMemberId, currentUser, allAssignmentsForMeeting, meetingDate, availability]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onAssignmentChange(meetingIndex, role, e.target.value || null);
    };

    const isUnassigned = !assignedMemberId;
    const assignedMember = assignedMemberId ? availableMembers.find(m => m.id === assignedMemberId) : null;
    
    // Check if current user is assigned to this role and account is linked
    const isCurrentUserAssigned = currentUser?.uid && assignedMember?.uid === currentUser.uid;

    const baseClasses = "w-full bg-gray-50 dark:bg-gray-700 !border-2 !border-gray-300 dark:!border-gray-600 rounded-md shadow-sm py-1.5 px-1 sm:py-2 sm:px-3 text-[12px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-center appearance-none min-w-0 overflow-hidden";
    const unassignedClasses = "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 font-semibold !border-red-300 dark:!border-red-700";
    const assignedClasses = "bg-white dark:bg-gray-700 !border-gray-300 dark:!border-gray-600";
    const currentUserAssignedClasses = "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-semibold !border-blue-400 dark:!border-blue-500 shadow-md hover:shadow-lg transition-shadow duration-200";
    const readOnlyClasses = "bg-gray-100 dark:bg-gray-600 !border-gray-300 dark:!border-gray-500 text-gray-700 dark:text-gray-300";

    // If disabled and has no edit permissions, show read-only display
    if (disabled && membersForThisRole.length === 0) {
        return (
            <div className={`${baseClasses.replace('py-1.5 px-1 sm:py-2 sm:px-3', 'py-2 px-2 sm:py-2 sm:px-3')} ${isUnassigned ? unassignedClasses : (isCurrentUserAssigned ? currentUserAssignedClasses : readOnlyClasses)}`}>
                {isUnassigned ? '-- Unassigned --' : (isCurrentUserAssigned ? `👤 ${assignedMember?.name} (You)` : assignedMember?.name || '-- Unknown --')}
            </div>
        );
    }

    // Determine which style class to use for the dropdown
    let dropdownClasses;
    if (isUnassigned) {
        dropdownClasses = unassignedClasses;
    } else if (isCurrentUserAssigned) {
        dropdownClasses = currentUserAssignedClasses;
    } else {
        dropdownClasses = assignedClasses;
    }

    return (
        <select
            value={assignedMemberId || ''}
            onChange={handleChange}
            disabled={disabled}
            className={`${baseClasses} ${dropdownClasses} ${disabled ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}`}
            aria-label={`Assign role for ${role}`}
            title={isCurrentUserAssigned ? "This is your assignment - click to change or unassign" : undefined}
        >
            <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-normal">-- Unassigned --</option>
            {membersForThisRole.map(member => {
                const dateKey = meetingDate.split('T')[0];
                const memberAvailability = availability[member.id]?.[dateKey];
                const isAvailable = memberAvailability === AvailabilityStatus.Available || 
                                  memberAvailability === undefined; // Default to available if not set
                
                // Get current roles for this member (excluding the current role being assigned)
                const assignedRolesForMember = Object.keys(allAssignmentsForMeeting).filter(
                    r => allAssignmentsForMeeting[r] === member.id && r !== role
                );
                
                // New format: "Name (Role)" instead of "Name (as Role)"
                let displayText = member.name;
                if (assignedRolesForMember.length > 0 && member.id !== assignedMemberId) {
                    // Truncate long role lists for better mobile display
                    const rolesText = assignedRolesForMember.length > 2
                        ? `${assignedRolesForMember.slice(0, 2).join(', ')}...`
                        : assignedRolesForMember.join(', ');
                    displayText = `${member.name} (${rolesText})`;
                }
                
                // Note: Green styling will be applied via CSS for available members without roles

                // Check if this is the current user and account is linked
                const isCurrentUser = currentUser?.uid && member.uid === currentUser.uid;
                const isAccountLinked = currentUser?.uid && member.uid === currentUser.uid;
                
                // For members (non-admins), only allow them to select themselves or unassign
                const isDisabled = currentUser?.role !== 'Admin' && !isCurrentUser;

                // Enhanced display text for current user when account is linked
                let finalDisplayText = displayText;
                if (isAccountLinked) {
                    const hasRoles = assignedRolesForMember.length > 0;
                    if (!hasRoles || member.id === assignedMemberId) {
                        finalDisplayText = `👤 ${member.name} (You)`;
                    } else {
                        finalDisplayText = `👤 ${displayText} - You`;
                    }
                }

                return (
                    <option
                        key={member.id}
                        value={member.id}
                        disabled={isDisabled}
                        className={`font-normal text-[12px] sm:text-sm py-1 ${
                            isAccountLinked
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 font-bold border-l-4 border-blue-500'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        } ${isDisabled ? 'opacity-50' : ''}`}
                        style={{
                            ...(isAvailable && assignedRolesForMember.length === 0 && !isAccountLinked && {
                                color: 'rgba(34, 197, 94, 0.7)' // More translucent green for available members
                            })
                        }}
                        title={finalDisplayText} // Show full text on hover for truncated items
                    >
                        {finalDisplayText}
                    </option>
                );
            })}
        </select>
    );
};
