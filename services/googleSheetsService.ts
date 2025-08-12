import { MonthlySchedule, Member, MemberAvailability, MemberStatus, AvailabilityStatus } from '../types';
import { TOASTMASTERS_ROLES } from '../Constants';

const getMemberName = (memberId: string | null, members: Member[]) => {
    if (!memberId) return '';
    return members.find(m => m.id === memberId)?.name || '[Deleted Member]';
};

export const exportScheduleToTsv = (
    schedule: MonthlySchedule,
    members: Member[],
    availability: { [memberId: string]: MemberAvailability }
): string => {

    const buildAvailabilityRows = (title: string, allMeetingsAvailability: any[], key: string): string[][] => {
        const rows: string[][] = [];
        const memberLists = allMeetingsAvailability.map(a => a[key]);
        const maxLength = Math.max(0, ...memberLists.map(list => list.length));

        // If the section is empty across all meetings, just add the header row to maintain structure.
        if (maxLength === 0) {
            return [[title]];
        }
    
        for (let i = 0; i < maxLength; i++) {
            const rowTitle = (i === 0) ? title : '';
            const memberRowData = memberLists.map(list => list[i] || '');
            rows.push([rowTitle, ...memberRowData]);
        }
        return rows;
    };


    // 1. Prepare Data Grid in a 2D array
    const headerRow = ['Role', ...schedule.meetings.map(m => new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }))];
    const themeRow = ['Theme', ...schedule.meetings.map(m => m.isBlackout ? '---' : m.theme)];

    const roleRows = TOASTMASTERS_ROLES.map(role => [
        role,
        ...schedule.meetings.map(m => {
            if (m.isBlackout) return 'BLACKOUT';
            return getMemberName(m.assignments[role], members)
        }),
    ]);
    
    const allMeetingsAvailability = schedule.meetings.map(meeting => {
        if (meeting.isBlackout) {
            return { unavailable: [], potentially: [], availableUnassigned: [] };
        }

        const assignedMemberIds = new Set(Object.values(meeting.assignments).filter(id => id));
        const unavailable: string[] = [];
        const potentially: string[] = [];
        const availableUnassigned: string[] = [];

        members.forEach(member => {
            if (assignedMemberIds.has(member.id)) {
                return;
            }

            let finalStatus: AvailabilityStatus;
            const dateKey = meeting.date.split('T')[0];

            if (member.status === MemberStatus.Unavailable || member.status === MemberStatus.Archived) {
                finalStatus = AvailabilityStatus.Unavailable;
            } else if (member.status === MemberStatus.Possible) {
                finalStatus = AvailabilityStatus.Possible;
            } else {
                const weeklyOverride = availability[member.id]?.[dateKey];
                finalStatus = weeklyOverride || AvailabilityStatus.Available;
            }

            switch (finalStatus) {
                case AvailabilityStatus.Unavailable:
                    unavailable.push(member.name);
                    break;
                case AvailabilityStatus.Possible:
                    potentially.push(member.name);
                    break;
                case AvailabilityStatus.Available:
                    availableUnassigned.push(member.name);
                    break;
            }
        });

        return { unavailable: unavailable.sort(), potentially: potentially.sort(), availableUnassigned: availableUnassigned.sort() };
    });

    const availableUnassignedRows = buildAvailabilityRows('Available', allMeetingsAvailability, 'availableUnassigned');
    const potentiallyAvailableRows = buildAvailabilityRows('Possible', allMeetingsAvailability, 'potentially');
    const unavailableRows = buildAvailabilityRows('Unavailable', allMeetingsAvailability, 'unavailable');

    const dataGrid = [
        headerRow,
        themeRow,
        ...roleRows,
        [''], // Spacer
        ...availableUnassignedRows,
        [''], // Spacer
        ...potentiallyAvailableRows,
        [''], // Spacer
        ...unavailableRows,
    ];

    // 2. Convert 2D array to TSV string
    return dataGrid.map(row => row.join('\t')).join('\n');
};