import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Member, RoleAssignment, AvailabilityStatus, MemberStatus } from '../../types';
// TOASTMASTERS_ROLES: All roles that appear on the monthly schedule.
// MAJOR_ROLES: Roles requiring more experience/leadership (see Constants.ts for full list and comments).
// MINOR_ROLES: Supporting roles, typically require less experience (see Constants.ts).
import { MAJOR_ROLES, TOASTMASTERS_ROLES } from '../../Constants';
import { useToastmasters } from '../../Context/ToastmastersContext';
import { canUnassignSelfFromToastmaster } from '../../utils/adminTransitionUtils';

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
  highlightColor?: string;
}> = ({ meetingIndex, role, assignedMemberId, availableMembers, onAssignmentChange, allAssignmentsForMeeting, disabled, meetingDate, availability, highlightColor }) => {
    const { currentUser, ownerId, organization, schedules, selectedScheduleId, adminStatus } = useToastmasters();
    
    const isAdmin = adminStatus?.hasAdminRights || false;

    // Local dark mode detector: only honor class-based dark mode (we force light mode globally)
    const useIsDarkTheme = () => {
        const [isDark, setIsDark] = React.useState(false);

        React.useEffect(() => {
            const check = () => {
                const docEl = document.documentElement;
                const bodyEl = document.body;
                const rootEl = document.getElementById('root') || document.getElementById('app');
                const classHasDark = (el?: Element | null) => !!el && el.classList.contains('dark');
                const classBased = classHasDark(docEl) || classHasDark(bodyEl) || classHasDark(rootEl);
                setIsDark(!!classBased);
            };
            check();

            const observer = new MutationObserver(check);
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            const rootEl = document.getElementById('root') || document.getElementById('app');
            if (rootEl) observer.observe(rootEl, { attributes: true, attributeFilter: ['class'] });

            return () => {
                observer.disconnect();
            };
        }, []);

        return isDark;
    };

    const isDark = useIsDarkTheme();
    
    const membersForThisRole = useMemo(() => {
        // Get the required qualification for this role
        const requiredQualificationKey = {
            'Toastmaster': 'isToastmaster',
            'Table Topics Master': 'isTableTopicsMaster',
            'General Evaluator': 'isGeneralEvaluator',
            'Inspiration Award': 'isPastPresident'
        }[role] as keyof Member;

        // Exclude archived members from dropdown selection, but allow currently assigned archived member to remain selectable
        const filterOutArchived = (m: Member) => m.status !== 'Archived';

        // Get qualified members for this role, excluding only the club admin (owner) and archived
        const qualifiedMembers = requiredQualificationKey 
            ? availableMembers.filter(m => 
                m[requiredQualificationKey] && 
                m.uid !== ownerId && 
                (!organization || !m.name.includes(organization.name)) &&
                filterOutArchived(m)
              )
            : availableMembers.filter(m => 
                m.uid !== ownerId && 
                (!organization || !m.name.includes(organization.name)) &&
                filterOutArchived(m)
              );

        // For members (non-admins), only show themselves and currently assigned member
        if (disabled) {
            const currentMember = currentUser?.uid ? availableMembers.find(m => m.uid === currentUser.uid) : null;
            if (!currentMember) return [];

            let membersToShow = [];

            // Always include the current user if they're qualified for this role
            const isCurrentUserQualified = requiredQualificationKey 
                ? currentMember[requiredQualificationKey] 
                : true; // If no qualification required, everyone is qualified

            if (isCurrentUserQualified) {
                membersToShow.push(currentMember);
            }

            // If someone else is currently assigned, also show them (for viewing/unassigning purposes)
            if (assignedMemberId && assignedMemberId !== currentMember.id) {
                const assignedMember = availableMembers.find(m => m.id === assignedMemberId);
                if (assignedMember && !membersToShow.some(m => m.id === assignedMember.id)) {
                    membersToShow.unshift(assignedMember); // Add at the beginning
                }
            }

            return membersToShow;
        }

        // For admins, order by current role hierarchy (Toastmaster first ... Inspiration Award last),
        // then members with no role; among no-role members, place "available" at the bottom
        const dateKey = meetingDate.split('T')[0];

        // For roles requiring qualifications, only show qualified members (excluding club admin and archived)
        // For other roles, show all available members (excluding club admin and archived)
        let allMembers = requiredQualificationKey ? [...qualifiedMembers] : [...availableMembers.filter(m => 
            m.uid !== ownerId && 
            (!organization || !m.name.includes(organization.name)) &&
            filterOutArchived(m)
        )];
        
        // For qualified roles, still include currently assigned member even if unqualified or archived (so they can see/remove the assignment)
        // But don't include club admin even if they're currently assigned
        if (requiredQualificationKey) {
            const currentlyAssignedMember = assignedMemberId ? availableMembers.find(m => m.id === assignedMemberId || m.uid === assignedMemberId) : null;
            if (currentlyAssignedMember && 
                currentlyAssignedMember.uid !== ownerId && 
                (!organization || !currentlyAssignedMember.name.includes(organization.name)) &&
                !qualifiedMembers.some(m => m.id === currentlyAssignedMember.id)) {
                allMembers.unshift(currentlyAssignedMember);
            }
        } else {
            // For non-qualified roles, also include currently assigned member if archived
            const currentlyAssignedMember = assignedMemberId ? availableMembers.find(m => m.id === assignedMemberId || m.uid === assignedMemberId) : null;
            if (currentlyAssignedMember &&
                currentlyAssignedMember.uid !== ownerId &&
                (!organization || !currentlyAssignedMember.name.includes(organization.name)) &&
                !allMembers.some(m => m.id === currentlyAssignedMember.id)) {
                allMembers.unshift(currentlyAssignedMember);
            }
        }

        type MemberSortInfo = {
            member: Member;
            roleIndexes: number[]; // indexes of roles this member holds in this meeting
            hasAnyRole: boolean;
            isAvailableNoRole: boolean; // only relevant when hasAnyRole === false
            finalStatus?: AvailabilityStatus;
            availabilityRank?: number;
        };

        const sortInfos: MemberSortInfo[] = allMembers.map(member => {
            // Check both member.id and member.uid for compatibility
            const rolesInMeeting = Object.keys(allAssignmentsForMeeting).filter(r => 
                allAssignmentsForMeeting[r] === member.id || allAssignmentsForMeeting[r] === member.uid
            );
            const roleIndexes = rolesInMeeting.map(r => TOASTMASTERS_ROLES.indexOf(r)).filter(i => i >= 0);
            const hasAnyRole = roleIndexes.length > 0;

            // Determine final availability status for this member on this date:
            // - Global member.status overrides weekly availability (Unavailable/Possible)
            // - Otherwise use per-date availability, defaulting to Available
            let finalStatus: AvailabilityStatus = AvailabilityStatus.Available;
            if (member.status === MemberStatus.Unavailable) {
                finalStatus = AvailabilityStatus.Unavailable;
            } else if (member.status === MemberStatus.Possible) {
                finalStatus = AvailabilityStatus.Possible;
            } else {
                const perDate = availability[member.id]?.[dateKey];
                finalStatus = perDate || AvailabilityStatus.Available;
            }

            const isAvailable = finalStatus === AvailabilityStatus.Available;
            const availabilityRank = finalStatus === AvailabilityStatus.Available ? 0 : (finalStatus === AvailabilityStatus.Possible ? 1 : 2);
            return {
                member,
                roleIndexes,
                hasAnyRole,
                isAvailableNoRole: !hasAnyRole && isAvailable,
                finalStatus,
                availabilityRank,
            };
        });

        sortInfos.sort((a: any, b: any) => {
            // Members already holding any role in this meeting come first (to allow quick reassignments)
            if (a.hasAnyRole && !b.hasAnyRole) return -1;
            if (!a.hasAnyRole && b.hasAnyRole) return 1;

            if (a.hasAnyRole && b.hasAnyRole) {
                const aIdx = Math.min(...a.roleIndexes);
                const bIdx = Math.min(...b.roleIndexes);
                if (aIdx !== bIdx) return aIdx - bIdx;
                return a.member.name.localeCompare(b.member.name);
            }

            // Neither has a role: order by availability — Available, then Possible, then Unavailable
            if (a.availabilityRank !== b.availabilityRank) return a.availabilityRank - b.availabilityRank;
            return a.member.name.localeCompare(b.member.name);
        });

        return sortInfos.map(s => s.member);
    }, [role, availableMembers, assignedMemberId, currentUser, allAssignmentsForMeeting, meetingDate, availability]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMemberId = e.target.value || null;
        
        // Check for buffer protection when unassigning self from Toastmaster role
        if (role === 'Toastmaster' && assignedMemberId && !newMemberId && currentUser?.uid) {
            const activeSchedule = schedules.find(s => s.id === selectedScheduleId);
            
            if (activeSchedule && organization) {
                const bufferCheck = canUnassignSelfFromToastmaster(
                    currentUser.uid,
                    currentUser.role || 'Member',
                    activeSchedule,
                    organization,
                    availableMembers,
                    organization.meetingDay || 2,
                    organization.timezone || 'UTC',
                    meetingIndex
                );
                
                if (!bufferCheck.canUnassign) {
                    if (bufferCheck.reason === 'buffer_protection_active') {
                        const hoursRemaining = Math.ceil(bufferCheck.bufferTimeRemaining || 0);
                        alert(`Cannot unassign yourself from Toastmaster role within 24 hours of the meeting. ${hoursRemaining} hours remaining.`);
                    } else {
                        alert(`Cannot unassign yourself from Toastmaster role: ${bufferCheck.reason}`);
                    }
                    return;
                }
            }
        }
        
        onAssignmentChange(meetingIndex, role, newMemberId);
    };

    const isUnassigned = !assignedMemberId;
    const assignedMember = assignedMemberId ? availableMembers.find(m => m.id === assignedMemberId) : null;
    
    // Check if current user is assigned to this role and account is linked
    const isCurrentUserAssignedToThisRole = currentUser?.uid && assignedMember?.uid === currentUser.uid;

    const baseClasses = "w-full bg-gray-50 dark:bg-gray-700 !border-2 !border-gray-300 dark:!border-gray-600 rounded-md shadow-sm py-1.5 px-1 sm:py-2 sm:px-3 text-[12px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-gray-900 dark:text-gray-100 text-center appearance-none min-w-0 overflow-hidden";
    const unassignedClasses = "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 font-semibold !border-red-300 dark:!border-red-700";
    const assignedClasses = "bg-white dark:bg-gray-700 !border-gray-300 dark:!border-gray-600";
    // When the current user is assigned, keep the highlight box but ensure dark-mode text is dark for readability
    const currentUserAssignedClasses = "bg-blue-50 dark:!bg-transparent text-blue-900 dark:!text-gray-900 font-semibold !border-blue-400 dark:!border-blue-500 shadow-md hover:shadow-lg transition-shadow duration-200";
    const readOnlyClasses = "bg-gray-100 dark:bg-gray-600 !border-gray-300 dark:!border-gray-500 text-gray-700 dark:text-gray-300";

    // If disabled and has no edit permissions, show read-only display
    // But always allow unassigning if someone is currently assigned
    if (disabled && membersForThisRole.length === 0 && !assignedMemberId) {
        const displayName = assignedMember?.name || '-- Unknown --';
        
        return (
            <div className="relative w-full">
                <div className={`${baseClasses.replace('py-1.5 px-1 sm:py-2 sm:px-3', 'py-2 px-2 sm:py-2 sm:px-3').replace('text-center', '')} ${isUnassigned ? unassignedClasses : (isCurrentUserAssignedToThisRole ? currentUserAssignedClasses : readOnlyClasses)}`}
                     style={{
                         // Safari-specific fixes for text centering
                         textAlign: 'center',
                         WebkitTextAlign: 'center'
                     }}>
                    <span className="dark:text-[inherit]" style={{ color: undefined }} data-dark-color={highlightColor}>
                        {isUnassigned ? '-- Unassigned --' : displayName}
                    </span>
                </div>
            </div>
        );
    }

    // Determine which style class to use for the dropdown
    let dropdownClasses;
    if (isUnassigned) {
        dropdownClasses = unassignedClasses;
    } else if (isCurrentUserAssignedToThisRole) {
        dropdownClasses = currentUserAssignedClasses;
    } else {
        dropdownClasses = assignedClasses;
    }

    // Get display text for currently assigned member
    const getAssignedMemberDisplayText = () => {
        if (!assignedMemberId) return '';

        // Find the assigned member in the available list, or fallback to all members if not found
        let assignedMember = availableMembers.find(m => m.id === assignedMemberId);
        if (!assignedMember && organization && Array.isArray(organization.members)) {
            assignedMember = organization.members.find(m => m.id === assignedMemberId);
        }
        if (!assignedMember) return '-- Unknown --';
        // Always return just the name for the schedule cell
        return assignedMember.name;
    };

    return (
        <div className="relative w-full">
            <select
                value={assignedMemberId || ''}
                onChange={handleChange}
                disabled={disabled}
                className={`${baseClasses.replace('text-center', '')} ${dropdownClasses} ${disabled ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}`}
                aria-label={`Assign role for ${role}`}
                title={isCurrentUserAssignedToThisRole ? "This is your assignment - click to change or unassign" : undefined}
                style={{
                    // Safari-specific fixes for text centering
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    textAlign: 'center',
                    // Force centering for Safari
                    textAlignLast: 'center',
                    // Additional Safari-specific properties
                    WebkitTextAlign: 'center'
                }}
            >
                <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-normal">-- Unassigned --</option>
                {/* Custom option for currently assigned member if archived, shown at the bottom, red, with (Archived) */}
                {membersForThisRole.map(member => {
                    const dateKey = meetingDate.split('T')[0];
                    // Compute final availability status for styling and grouping
                    let finalStatus: AvailabilityStatus = AvailabilityStatus.Available;
                    if (member.status === MemberStatus.Unavailable) {
                        finalStatus = AvailabilityStatus.Unavailable;
                    } else if (member.status === MemberStatus.Possible) {
                        finalStatus = AvailabilityStatus.Possible;
                    } else {
                        const perDate = availability[member.id]?.[dateKey];
                        finalStatus = perDate || AvailabilityStatus.Available;
                    }
                    const isAvailable = finalStatus === AvailabilityStatus.Available;
                
                    // Get current roles for this member (excluding the current role being assigned)
                    const assignedRolesForMember = Object.keys(allAssignmentsForMeeting).filter(
                        r => (allAssignmentsForMeeting[r] === member.id || allAssignmentsForMeeting[r] === member.uid) && r !== role
                    );
                
                    // New format: "Name (Role)" instead of "Name (as Role)"
                    let displayText = member.name;
                    if (assignedRolesForMember.length > 0 && member.id !== assignedMemberId && member.uid !== assignedMemberId) {
                        // Truncate long role lists for better mobile display
                        const rolesText = assignedRolesForMember.length > 2
                            ? `${assignedRolesForMember.slice(0, 2).join(', ')}...`
                            : assignedRolesForMember.join(', ');
                        displayText = `${member.name} (${rolesText})`;
                    }
                
                    // Note: Green styling will be applied via CSS for available members without roles

                    // Check if this is the current user and account is linked
                    const isCurrentUserAssignedInRole = currentUser?.uid && member.uid === currentUser.uid;
                    const isAccountLinked = currentUser?.uid && member.uid === currentUser.uid;
                
                    // For members (non-admins), only allow them to select themselves, unassign, or if role is unassigned
                    const isRoleUnassigned = !assignedMemberId;
                    const currentMember = currentUser?.uid ? availableMembers.find(m => m.uid === currentUser.uid) : null;
                    const isCurrentUserAssignedToThisRole = assignedMemberId === currentMember?.id || assignedMemberId === currentMember?.uid;
                    const isDisabled = currentUser?.role !== 'Admin' && !isCurrentUserAssignedInRole && !isRoleUnassigned && !isCurrentUserAssignedToThisRole;

                    // Enhanced display text for current user when account is linked
                    let finalDisplayText = displayText;
                    // Remove the "(You)" suffix - just show the name normally
                    if (isAccountLinked && member.id === assignedMemberId) {
                        finalDisplayText = `👤 ${member.name}`;
                    }
                
                    // Mentorship icons removed from schedule display - mentorship system is separate

                    // Theme-aware option style: in dark mode, use text-only colors (no filled backgrounds)
                    const getOptionStyle = () => {
                        const styles: React.CSSProperties = {};
                        if (finalStatus === AvailabilityStatus.Available) {
                            // Dark mode: always show available members in green text for clear mapping
                            if (isDark) {
                                // Only color green when the member does not already hold a role in this meeting
                                if (assignedRolesForMember.length === 0) {
                                    styles.color = '#86EFAC'; /* green-300 */
                                    styles.fontWeight = 500 as any;
                                }
                            } else {
                                // Light mode: keep filled backgrounds off for Available to avoid tint stacking
                                // Let default text color show (or apply subtle green if desired in future)
                            }
                        } else if (finalStatus === AvailabilityStatus.Possible) {
                            if (isDark) {
                                // Only color yellow when the member does not already hold a role in this meeting
                                if (assignedRolesForMember.length === 0) {
                                    // Use a brighter yellow in dark mode for better contrast against gray-900
                                    styles.color = '#FDE047'; /* yellow-300 */
                                    styles.fontWeight = 500 as any;
                                }
                            } else {
                                styles.backgroundColor = '#FEF3C7'; /* amber-100 */
                                styles.color = '#111827'; /* gray-900 for readability */
                            }
                        } else if (finalStatus === AvailabilityStatus.Unavailable) {
                            if (isDark) {
                                // Only color red when the member does not already hold a role in this meeting
                                if (assignedRolesForMember.length === 0) {
                                    styles.color = '#FCA5A5'; /* red-300 */
                                }
                            } else {
                                styles.backgroundColor = '#FEE2E2'; /* red-100 */
                                styles.color = '#111827';
                            }
                        }
                        return styles;
                    };

                    const statusAttr = finalStatus === AvailabilityStatus.Available
                        ? 'available'
                        : finalStatus === AvailabilityStatus.Possible
                        ? 'possible'
                        : 'unavailable';

                    return (
                        <option
                            key={member.id}
                            value={member.id}
                            disabled={isDisabled}
                            className={`font-normal text-[12px] sm:text-sm py-1 ${
                                isAccountLinked
                                    ? (isDark
                                        ? 'bg-white dark:bg-gray-800 text-blue-400 font-bold border-l-4 border-blue-500 current-user'
                                        : 'bg-blue-100 text-blue-900 font-bold border-l-4 border-blue-500')
                                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            } ${isDisabled ? 'opacity-50' : ''}`}
                            data-status={statusAttr}
                            data-hasrole={assignedRolesForMember.length > 0 ? 'true' : 'false'}
                            style={getOptionStyle()}
                            title={finalDisplayText} // Show full text on hover for truncated items
                        >
                            {finalDisplayText}
                        </option>
                    );
                })}
                {(() => {
                    // If the currently assigned member is archived, show at the bottom, red, with (Archived)
                    let assignedMember = availableMembers.find(m => m.id === assignedMemberId);
                    if (!assignedMember && organization && Array.isArray(organization.members)) {
                        assignedMember = organization.members.find(m => m.id === assignedMemberId);
                    }
                    if (
                        assignedMember &&
                        assignedMember.status === 'Archived' &&
                        !membersForThisRole.some(m => m.id === assignedMemberId)
                    ) {
                        return (
                            <option
                                key={assignedMember.id}
                                value={assignedMember.id}
                                className="font-normal text-[12px] sm:text-sm py-1 text-red-700 bg-white dark:bg-gray-800 font-bold"
                                style={{ fontWeight: 700 }}
                                title={`${assignedMember.name} (Archived)`}
                            >
                                {assignedMember.name} (Archived)
                            </option>
                        );
                    }
                    return null;
                })()}
            </select>
        </div>
    );
};
