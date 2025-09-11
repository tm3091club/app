import { Member, MonthlySchedule, Meeting, RoleAssignment, MemberStatus, AvailabilityStatus, MemberAvailability, OfficerRole } from '../types';
import { TOASTMASTERS_ROLES } from '../Constants';

/**
 * Creates a deep clone of an object, stripping any non-POJO properties (like from Firestore).
 * This is essential for preventing "circular structure" errors.
 * @param obj The object to clone.
 * @returns A deep-cloned plain JavaScript object.
 */
export const deepClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    // Handle Date
    if (obj instanceof Date) {
        return new Date(obj.getTime()) as any;
    }
    // Handle Array
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item)) as any;
    }
    // Handle Object
    const clonedObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          clonedObj[key] = deepClone((obj as any)[key]);
        }
    }
    return clonedObj as T;
};


// Role categories
const HIGH_ROLES = ['President', 'Toastmaster', 'Table Topics Master', 'General Evaluator'];
const SPEAKER_ROLES = ['Speaker 1', 'Speaker 2', 'Speaker 3'];
const EVALUATOR_ROLES = ['Evaluator 1', 'Evaluator 2', 'Evaluator 3'];
const INSPIRATION_ROLE = 'Inspiration Award';
const MINOR_ROLES = TOASTMASTERS_ROLES.filter(r => 
    !HIGH_ROLES.includes(r) && 
    !SPEAKER_ROLES.includes(r) && 
    !EVALUATOR_ROLES.includes(r) && 
    r !== INSPIRATION_ROLE
);

// Helper to shuffle an array
function shuffleArray<T,>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Generates an array of dates for a given month, all falling on the same day of the week as the start date.
 * @param startDate The first meeting date, which determines the day of the week for all subsequent meetings.
 * @returns An array of Date objects for the meetings.
 */
export function getMeetingDatesForMonth(startDate: Date): Date[] {
  const dates: Date[] = [];
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth();
  const targetDayOfWeek = startDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

  // Find the first occurrence of the target day of week in the target month
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const firstDayOfWeek = firstDayOfMonth.getUTCDay();
  
  // Calculate days to add to get to the first occurrence of target day
  let daysToAdd = (targetDayOfWeek - firstDayOfWeek + 7) % 7;
  
  // Start from the first occurrence of the target day in the month
  const date = new Date(Date.UTC(year, month, 1 + daysToAdd));

  // Add dates for the entire month
  while (date.getUTCMonth() === month) {
    dates.push(new Date(date));
    date.setUTCDate(date.getUTCDate() + 7);
  }

  return dates;
}

export const generateNewMonthSchedule = (
  year: number,
  month: number, // 0-indexed
  meetingDates: Date[],
  themes: string[],
  members: Member[],
  availability: { [memberId: string]: MemberAvailability },
  allSchedules: MonthlySchedule[],
  clubOwnerId?: string,
  clubName?: string
): MonthlySchedule => {
  
  // Filter out inactive members and the club admin (owner)
  const activeMembers = members.filter(m => {
    // Filter out inactive members
    if (m.status !== MemberStatus.Active) return false;
    
    // Filter out club admin by UID
    if (clubOwnerId && m.uid === clubOwnerId) return false;
    
    // Filter out any member with club name (backup filter)
    if (clubName && m.name.includes(clubName)) return false;
    
    return true;
  });
  
  // --- Previous Month's Data Analysis ---
  const prevMonthDate = new Date(year, month - 1, 1);
  const prevMonthId = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthSchedule = allSchedules.find(s => s.id === prevMonthId);

  const prevMonthSpeakers = new Set<string>();
  const prevMonthEvaluators = new Set<string>();

  if (prevMonthSchedule) {
      prevMonthSchedule.meetings.forEach(meeting => {
          Object.entries(meeting.assignments).forEach(([role, memberId]) => {
              if (memberId) {
                  if (SPEAKER_ROLES.includes(role)) prevMonthSpeakers.add(memberId);
                  if (EVALUATOR_ROLES.includes(role)) prevMonthEvaluators.add(memberId);
              }
          });
      });
  }

  // Monthly tracking
  const memberRoleHistory = new Map<string, Set<string>>();
  activeMembers.forEach(m => memberRoleHistory.set(m.id, new Set()));
  const monthlySpeakers = new Set<string>();
  const monthlyEvaluators = new Set<string>(); // For tracking evaluators this month to improve variety

  const meetings: Meeting[] = meetingDates.map((date, index) => {
    const assignments: RoleAssignment = {};
    TOASTMASTERS_ROLES.forEach(role => assignments[role] = null);
    
    // Use local timezone formatting to avoid timezone issues
    const meetingDateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const availableForMeeting = shuffleArray(activeMembers.filter(m => {
        const status = availability[m.id]?.[meetingDateKey];
        return status !== AvailabilityStatus.Unavailable && status !== AvailabilityStatus.Possible;
    }));
    

    // Weekly tracking
    const assignedInMeeting = new Set<string>();

    const assignRole = (role: string, memberPool: Member[]): Member | null => {
        for (const member of memberPool) {
            if (assignedInMeeting.has(member.id) ||
                (SPEAKER_ROLES.includes(role) && monthlySpeakers.has(member.id)) ||
                (memberRoleHistory.get(member.id)?.has(role))) {
                continue;
            }

            assignments[role] = member.id;
            assignedInMeeting.add(member.id);
            memberRoleHistory.get(member.id)?.add(role);

            if (SPEAKER_ROLES.includes(role)) monthlySpeakers.add(member.id);
            if (EVALUATOR_ROLES.includes(role)) monthlyEvaluators.add(member.id);

            return member;
        }
        return null;
    };

    // Special function for President role with President/VPE priority
    const assignPresidentWithOfficerPriority = (): Member | null => {
        
        // First, try to assign to the actual President if available
        const president = availableForMeeting.find(m => 
            m.officerRole === OfficerRole.President
        );
        
        if (president) {
            assignments['President'] = president.id;
            // Don't add to assignedInMeeting - allow President to have multiple roles
            // Don't track role history - President can have same role every week
            return president;
        }

        // If President is not available, try VPE if available
        const vpe = availableForMeeting.find(m => 
            m.officerRole === OfficerRole.VicePresidentEducation
        );
        
        if (vpe) {
            assignments['President'] = vpe.id;
            // Don't add to assignedInMeeting - allow VPE to have multiple roles when acting as President
            // Don't track role history - VPE can act as President multiple times
            return vpe;
        }
        // If neither President nor VPE are available, leave the role unassigned
        // (as requested - manual assignment only)
        return null;
    };

    // --- Assignment Order ---

    // 1. Assign Inspiration Role to Past Presidents
    assignRole(INSPIRATION_ROLE, shuffleArray(availableForMeeting.filter(m => m.isPastPresident)));

    // 2. Assign President role with officer priority first
    assignPresidentWithOfficerPriority();

    // 3. Assign other High Roles to qualified members
    HIGH_ROLES.forEach(role => {
        if (role === 'President') {
            // President role already handled above with officer priority
            return;
        }
        
        let qualifiedMembers: Member[] = [];
        if (role === 'Toastmaster') qualifiedMembers = availableForMeeting.filter(m => m.isToastmaster);
        if (role === 'Table Topics Master') qualifiedMembers = availableForMeeting.filter(m => m.isTableTopicsMaster);
        if (role === 'General Evaluator') qualifiedMembers = availableForMeeting.filter(m => m.isGeneralEvaluator);
        
        assignRole(role, shuffleArray(qualifiedMembers));
    });
    
    [INSPIRATION_ROLE, ...HIGH_ROLES].forEach(role => {
        if (!assignments[role]) {
            if (role === 'President') {
                // President role already handled with officer priority - don't fallback
                // Leave unassigned if neither President nor VPE are available
                return;
            } else {
                assignRole(role, availableForMeeting);
            }
        }
    });

    // 4. Assign Speaker Roles with seniority prioritization
    // Sort members by join date: oldest members first for Speaker 3, newest for Speaker 1
    const sortBySeniority = (members: Member[], reverse = false) => {
        return members.sort((a, b) => {
            // Members without join dates are treated as neutral (no preference)
            if (!a.joinedDate && !b.joinedDate) return 0;
            if (!a.joinedDate) return 0; // Don't penalize members without join dates
            if (!b.joinedDate) return 0; // Don't penalize members without join dates
            
            const dateA = new Date(a.joinedDate).getTime();
            const dateB = new Date(b.joinedDate).getTime();
            return reverse ? dateB - dateA : dateA - dateB;
        });
    };
    
    SPEAKER_ROLES.forEach((role, index) => {
        const prioritizedPool = availableForMeeting.filter(m => !prevMonthSpeakers.has(m.id));
        
        // For Speaker 3: oldest members first, for Speaker 1: newest members first
        const isReversed = role === 'Speaker 1';
        const sortedPool = sortBySeniority([...prioritizedPool], isReversed);
        
        if (!assignRole(role, sortedPool)) {
            // Fallback with same seniority sorting
            const sortedFallback = sortBySeniority([...availableForMeeting], isReversed);
            assignRole(role, sortedFallback);
        }
    });

    // 5. Assign Evaluator Roles with prioritization
    EVALUATOR_ROLES.forEach(role => {
        const highPriorityPool = availableForMeeting.filter(m => !monthlyEvaluators.has(m.id) && !prevMonthEvaluators.has(m.id));
        const mediumPriorityPool = availableForMeeting.filter(m => !monthlyEvaluators.has(m.id));
        
        if (!assignRole(role, shuffleArray(highPriorityPool))) {
            if (!assignRole(role, shuffleArray(mediumPriorityPool))) {
                assignRole(role, availableForMeeting); // Fallback
            }
        }
    });

    // 6. Assign Minor Roles
    MINOR_ROLES.forEach(role => assignRole(role, availableForMeeting));

    // 7. Final fallback - assign any remaining unassigned roles to available members
    const unassignedRoles = TOASTMASTERS_ROLES.filter(r => !assignments[r]);
    if (unassignedRoles.length > 0) {
        // Try to assign unassigned roles to any available member (ignore role history for final assignments)
        unassignedRoles.forEach(role => {
            for (const member of shuffleArray([...availableForMeeting])) {
                if (!assignedInMeeting.has(member.id)) {
                    assignments[role] = member.id;
                    assignedInMeeting.add(member.id);
                    break;
                }
            }
        });
        
        // If still unassigned, allow double roles for minor roles
        const stillUnassigned = TOASTMASTERS_ROLES.filter(r => !assignments[r]);
        if (stillUnassigned.length > 0) {
            let eligibleForDouble = shuffleArray(availableForMeeting.filter(m => {
                const assignedRole = Object.keys(assignments).find(role => assignments[role] === m.id);
                return assignedRole && MINOR_ROLES.includes(assignedRole);
            }));

            stillUnassigned.forEach(role => {
                 if (MINOR_ROLES.includes(role) && eligibleForDouble.length > 0) {
                     const member = eligibleForDouble.pop();
                     if (member) {
                         assignments[role] = member.id;
                     }
                 }
            });
        }
    }

    return {
      date: meetingDateKey,
      theme: themes[index] || `Meeting Theme ${index + 1}`,
      assignments,
    };
  });

  return {
    id: `${year}-${String(month + 1).padStart(2, '0')}`,
    year,
    month,
    meetings,
  };
};