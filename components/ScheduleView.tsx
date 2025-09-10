

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useToastmasters } from '../Context/ToastmastersContext';
import { generateNewMonthSchedule, deepClone } from '../services/scheduleLogic';
import { getNextScheduleMonth, getMeetingDatesForMonth as getMonthMeetingDates } from '../utils/monthUtils';
import { generateThemes } from '../services/geminiService';
import { exportScheduleToTsv } from '../services/googleSheetsService';
import { notificationService } from '../services/notificationService';
import { MAJOR_ROLES, TOASTMASTERS_ROLES } from '../Constants';
import { MemberStatus, Meeting, AvailabilityStatus, UserRole, RoleAssignment, MonthlySchedule } from '../types';
import { db } from '../services/firebase';
import firebase from 'firebase/compat/app';
import { useAuth } from '../Context/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Refactored Components
import { ShareModal } from './common/ShareModal';
import { ConfirmationModal } from './common/ConfirmationModal';
import { ScheduleToolbar } from './schedule/ScheduleToolbar';
import { ScheduleTable } from './schedule/ScheduleTable';
import { AvailabilityList } from './schedule/AvailabilityList';

export const ScheduleView: React.FC = () => {
    const { user } = useAuth();
    const { 
        schedules, 
        members, 
        availability, 
        addSchedule, 
        updateSchedule, 
        deleteSchedule: contextDeleteSchedule, 
        selectedScheduleId, 
        setSelectedScheduleId, 
        organization,
        currentUser,
        ownerId
    } = useToastmasters();
    
    // Component State
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showPreviousMonth, setShowPreviousMonth] = useState(false);

    // Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isGenerateConfirmOpen, setIsGenerateConfirmOpen] = useState(false);
    
    // Data State
    const [shareUrl, setShareUrl] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    const isAdmin = currentUser?.role === UserRole.Admin;

    // --- Data Hydration ---
    const hydratedMembers = useMemo(() => {
        return organization?.members || [];
    }, [organization?.members]);

    // The active schedule is now directly derived from the context's state.
    // No local copy is made, ensuring the view is always in sync with the database.
    const activeSchedule = useMemo(() => {
        if (!Array.isArray(schedules)) return null;
        return schedules.find(s => s.id === selectedScheduleId) || null;
    }, [schedules, selectedScheduleId]);

    // --- Granular Permission Logic for Members ---
    const canEditRoleAssignment = useCallback((meetingIndex: number, role: string) => {
        if (isAdmin) return true; // Admins can edit everything
        
        if (!activeSchedule || !currentUser?.uid) return false;
        
        const meeting = activeSchedule.meetings[meetingIndex];
        if (!meeting) return false;
        
        // Find the member profile for the current user
        const currentMember = hydratedMembers.find(m => m.uid === currentUser.uid);
        if (!currentMember) return false;
        
        // Check if the current user is assigned to this role in this meeting
        const isAssignedToThisRole = meeting.assignments[role] === currentMember.id;
        
        // Check if this role is currently unassigned
        const isRoleUnassigned = !meeting.assignments[role];
        
        // Members can only edit if they're assigned to this role or if the role is unassigned
        return isAssignedToThisRole || isRoleUnassigned;
    }, [isAdmin, activeSchedule, currentUser, hydratedMembers]);

    const canEditTheme = useCallback((meetingIndex: number) => {
        if (isAdmin) return true; // Admins can edit everything
        
        if (!activeSchedule || !currentUser?.uid) return false;
        
        const meeting = activeSchedule.meetings[meetingIndex];
        if (!meeting) return false;
        
        // Find the member profile for the current user
        const currentMember = hydratedMembers.find(m => m.uid === currentUser.uid);
        if (!currentMember) return false;
        
        // Check if the current user is assigned to any role in this meeting
        const isAssignedToAnyRole = Object.values(meeting.assignments).some(assignment => assignment === currentMember.id);
        
        // Members can only edit themes if they're assigned to a role in this meeting
        return isAssignedToAnyRole;
    }, [isAdmin, activeSchedule, currentUser, hydratedMembers]);

    const canToggleBlackout = useCallback((meetingIndex: number) => {
        // Only admins can toggle blackout
        return isAdmin;
    }, [isAdmin]);

    const activeMembers = useMemo(() => 
        hydratedMembers.filter(m => {
            // Filter out inactive members
            if (m.status !== MemberStatus.Active) return false;
            
            // Filter out club admin by UID
            if (m.uid === ownerId) return false;
            
            // Filter out any member with club name (backup filter)
            if (organization && m.name.includes(organization.name)) return false;
            
            return true;
        }), [hydratedMembers, ownerId, organization]);
    const allPastThemes = useMemo(() => {
        if (!Array.isArray(schedules)) return [];
        return schedules.flatMap(s => s.meetings.map(m => m.theme));
    }, [schedules]);
    
    const previousSchedule = useMemo(() => {
        if (!activeSchedule || !Array.isArray(schedules)) return null;
        const current = new Date(activeSchedule.year, activeSchedule.month);
        current.setMonth(current.getMonth() - 1);
        const prevId = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        return schedules.find(s => s.id === prevId) || null;
    }, [activeSchedule, schedules]);

    const previousScheduleToShow = useMemo(() => {
        if (!showPreviousMonth || !previousSchedule || previousSchedule.meetings.length === 0) return null;
        return previousSchedule.meetings;
    }, [showPreviousMonth, previousSchedule]);

    // Effect to reset compare view when schedule changes
    useEffect(() => {
        setShowPreviousMonth(false);
    }, [selectedScheduleId]);

    // Computed properties for UI logic
    const hasUnassignedRoles = useMemo(() => {
        if (!activeSchedule) return false;
        // Check if any MAJOR role is unassigned in any NON-BLACKOUT meeting
        return activeSchedule.meetings.some(meeting => {
            if (meeting.isBlackout) return false;
            return MAJOR_ROLES.some(role => !meeting.assignments[role]);
        });
    }, [activeSchedule]);
    


    const getMemberName = useCallback((memberId: string | null) => {
        if (!memberId) return '';
        // First try to find by member.id (for new assignments)
        const memberById = hydratedMembers.find(m => m.id === memberId);
        if (memberById) return memberById.name;
        
        // Then try to find by member.uid (for existing assignments that used UIDs)
        const memberByUid = hydratedMembers.find(m => m.uid === memberId);
        if (memberByUid) return memberByUid.name;
        
        return '[Deleted]';
    }, [hydratedMembers]);

    // Handlers now perform actions that will be immediately reflected
    const handleNewSchedule = useCallback(async () => {
        console.log('🚀 handleNewSchedule called!');
        console.log('📋 Organization:', organization);
        console.log('📋 Organization meetingDay:', organization?.meetingDay);
        console.log('📋 Members count:', hydratedMembers?.length);
        console.log('📋 Members:', hydratedMembers);
        
        if (!hydratedMembers || hydratedMembers.length === 0) {
            console.log('❌ No members found for schedule generation');
            setError("Please go to 'Manage Members' and add members before generating a schedule.");
            return;
        }
        
        if (!organization?.meetingDay && organization?.meetingDay !== 0) {
            console.log('❌ No meeting day set in organization');
            setError("Please set a meeting day in your Club Profile first.");
            return;
        }
        
        // Automatically determine the next month to generate
        const nextMonthInfo = getNextScheduleMonth(schedules, organization.meetingDay);
        const { year, month } = nextMonthInfo;
        console.log('📅 Next month info:', nextMonthInfo);
        
        const id = `${year}-${String(month + 1).padStart(2, '0')}`;
        if (Array.isArray(schedules) && schedules.some(s => s.id === id)) {
            setError('A schedule for this month already exists.');
            return;
        }
        setError(null);
        
        setIsLoading(true);
        setLoadingMessage('Generating schedule and themes...');
        
        try {
            // Get meeting dates for the month
            const meetingDates = getMonthMeetingDates(year, month, organization.meetingDay)
                .map(date => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));

            // Generate themes first
            const numThemes = meetingDates.length;
            let themes: string[] = [];
            
            if (numThemes > 0) {
                try {
                    console.log('🎯 Starting theme generation process...');
                    console.log('📊 Theme generation parameters:', {
                        month: new Date(year, month).toLocaleString('default', { month: 'long' }),
                        year,
                        numThemes,
                        pastThemesCount: allPastThemes.length
                    });
                    
                    console.log('🔧 About to call generateThemes function...');
                    themes = await generateThemes(
                        new Date(year, month).toLocaleString('default', { month: 'long' }),
                        year,
                        allPastThemes,
                        numThemes
                    );
                    console.log('✅ Successfully generated themes:', themes);
                } catch (themeError) {
                    console.error('❌ Failed to generate themes:', themeError);
                    console.error('Error details:', {
                        message: themeError instanceof Error ? themeError.message : 'Unknown error',
                        stack: themeError instanceof Error ? themeError.stack : 'No stack trace'
                    });
                    // Set error message to show user what went wrong
                    setError(`Failed to generate themes: ${themeError instanceof Error ? themeError.message : 'Unknown error'}`);
                    // Create fallback themes instead of empty strings
                    themes = Array(numThemes).fill(0).map((_, i) => `Meeting Theme ${i + 1}`);
                }
            }

            // Generate the schedule with themes
            const newSchedule = generateNewMonthSchedule(year, month, meetingDates, themes, hydratedMembers, availability, Array.isArray(schedules) ? schedules : [], ownerId || undefined, organization?.name);
            await addSchedule({ schedule: newSchedule });
            
            // Auto-select the newly created schedule
            setSelectedScheduleId(newSchedule.id);
        } catch (e: any) {
            setError(e.message || 'Failed to generate schedule.');
        } finally {
            setIsLoading(false);
        }
    }, [addSchedule, availability, hydratedMembers, schedules, organization, allPastThemes, setSelectedScheduleId]);

    const handlePrepareSchedule = useCallback(async (type: 'next' | 'previous') => {
        if (!hydratedMembers || hydratedMembers.length === 0) {
            setError("Please go to 'Manage Members' and add members before generating a schedule.");
            return;
        }
        
        if (!organization?.meetingDay && organization?.meetingDay !== 0) {
            setError("Please set a meeting day in your Club Profile first.");
            return;
        }
        
        setIsLoading(true);
        setLoadingMessage('Preparing blank schedule...');
        setError(null);
        
        try {
            let year: number, month: number;
            
            if (type === 'next') {
                const nextMonthInfo = getNextScheduleMonth(schedules, organization.meetingDay);
                year = nextMonthInfo.year;
                month = nextMonthInfo.month;
            } else {
                // Find the earliest schedule and go one month before
                const earliestSchedule = (Array.isArray(schedules) && schedules.length) ? schedules.reduce((earliest, schedule) => {
                    const earliestDate = new Date(earliest.year, earliest.month);
                    const scheduleDate = new Date(schedule.year, schedule.month);
                    return scheduleDate < earliestDate ? schedule : earliest;
                }) : null;
                
                if (earliestSchedule) {
                    year = earliestSchedule.year;
                    month = earliestSchedule.month - 1;
                    if (month < 0) {
                        month = 11;
                        year--;
                    }
                } else {
                    // No schedules exist, use current month
                    const now = new Date();
                    year = now.getFullYear();
                    month = now.getMonth();
                }
            }
            
            const id = `${year}-${String(month + 1).padStart(2, '0')}`;
            if (Array.isArray(schedules) && schedules.some(s => s.id === id)) {
                setError('A schedule for this month already exists.');
                return;
            }
            
            // Get meeting dates for the month
            const meetingDates = getMonthMeetingDates(year, month, organization.meetingDay)
                .map(date => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));

            // Create blank schedule (no role assignments, no themes)
            const blankSchedule: MonthlySchedule = {
                id,
                year,
                month,
                meetings: meetingDates.map(date => ({
                    date: date.toISOString(),
                    theme: '',
                    isBlackout: false,
                    assignments: Object.fromEntries(
                        TOASTMASTERS_ROLES.map(role => [role, null])
                    ) as RoleAssignment
                })),
                isShared: false,
                shareId: null
            };
            
            await addSchedule({ schedule: blankSchedule });
            
            // Auto-select the newly created schedule
            setSelectedScheduleId(blankSchedule.id);
        } catch (e: any) {
            setError(e.message || 'Failed to prepare schedule.');
        } finally {
            setIsLoading(false);
        }
    }, [schedules, organization, addSchedule, setSelectedScheduleId, hydratedMembers]);

    const handleConfirmDelete = useCallback(async () => {
        if (!selectedScheduleId || !organization?.clubNumber) return;
        
        setIsLoading(true);
        setLoadingMessage('Deleting schedule...');
        setError(null);
        setIsDeleteModalOpen(false); 

        try {
            const scheduleToDelete = Array.isArray(schedules) ? schedules.find(s => s.id === selectedScheduleId) : null;
            if (scheduleToDelete?.isShared && scheduleToDelete.shareId) {
                const docId = `${organization.clubNumber}_${scheduleToDelete.shareId}`;
                await db.collection("publicSchedules").doc(docId).delete();
            }
            await contextDeleteSchedule({ scheduleId: selectedScheduleId });
        } catch (e: any) {
            console.error("Deletion failed:", e);
            setError(e.message || 'Failed to delete schedule.');
        } finally {
            setIsLoading(false);
        }
    }, [contextDeleteSchedule, organization, schedules, selectedScheduleId]);
    


    const handleConfirmGenerateSchedule = useCallback(async () => {
        if (!activeSchedule) {
            return;
        }
        setIsGenerateConfirmOpen(false);
        setIsLoading(true);
        setLoadingMessage('Generating schedule and themes...');
        setError(null);
        try {
            // Get existing themes or generate new ones
            let themes = activeSchedule.meetings.map(m => m.theme || '');
            
            const meetingDates = activeSchedule.meetings.map(m => new Date(m.date));
            
            const nonBlackoutMeetings = activeSchedule.meetings.filter(m => !m.isBlackout);
            
            const needsThemes = nonBlackoutMeetings.some(m => 
                !m.theme || 
                m.theme.trim() === '' || 
                m.theme.startsWith('Meeting Theme ')
            );
            
            // Generate themes for meetings that don't have them yet
            if (needsThemes) {
                try {
                    const newThemes = await generateThemes(
                        new Date(activeSchedule.year, activeSchedule.month).toLocaleString('default', { month: 'long' }),
                        activeSchedule.year,
                        allPastThemes,
                        nonBlackoutMeetings.length
                    );
                    
                    // Replace empty or default themes with generated ones
                    let themeIndex = 0;
                    themes = activeSchedule.meetings.map(meeting => {
                        if (meeting.isBlackout) return meeting.theme || '';
                        if (!meeting.theme || 
                            meeting.theme.trim() === '' || 
                            meeting.theme.startsWith('Meeting Theme ')) {
                            return newThemes[themeIndex++] || '';
                        }
                        return meeting.theme;
                    });
                } catch (themeError) {
                    setError(`Failed to generate themes: ${themeError instanceof Error ? themeError.message : 'Unknown error'}`);
                }
            }
            
            const regeneratedSchedule = generateNewMonthSchedule(
                activeSchedule.year,
                activeSchedule.month,
                meetingDates,
                themes,
                hydratedMembers,
                availability,
                Array.isArray(schedules) ? schedules : [],
                ownerId || undefined,
                organization?.name
            );
            
            const finalSchedule = { ...activeSchedule, meetings: regeneratedSchedule.meetings };

            finalSchedule.meetings.forEach((meeting, index) => {
                if (activeSchedule.meetings[index].isBlackout) {
                    meeting.isBlackout = true;
                    Object.keys(meeting.assignments).forEach(role => {
                        meeting.assignments[role] = null;
                    });
                }
            });

            await updateSchedule({ schedule: finalSchedule });
        } catch (e: any) {
            console.error('❌ Error in regenerate process:', e);
            setError(e.message || 'Failed to generate the schedule.');
        } finally {
            setIsLoading(false);
        }
    }, [activeSchedule, availability, hydratedMembers, schedules, updateSchedule, allPastThemes]);

    const handleGenerateThemes = useCallback(async () => {
        if (!activeSchedule) return;
        
        setIsLoading(true);
        setLoadingMessage('Generating creative themes with AI...');
        setError(null);
        
        try {
            const nonBlackoutMeetings = activeSchedule.meetings.filter(m => !m.isBlackout);
            
            if (nonBlackoutMeetings.length === 0) {
                setIsLoading(false);
                return;
            }
            
            const newThemes = await generateThemes(
                new Date(activeSchedule.year, activeSchedule.month).toLocaleString('default', { month: 'long' }),
                activeSchedule.year,
                allPastThemes,
                nonBlackoutMeetings.length
            );
            
            // Update all non-blackout meetings with new themes
            const updatedSchedule = deepClone(activeSchedule);
            let themeIndex = 0;
            updatedSchedule.meetings.forEach((meeting) => {
                if (!meeting.isBlackout) {
                    meeting.theme = newThemes[themeIndex] || meeting.theme;
                    themeIndex++;
                }
            });
            
            await updateSchedule({ schedule: updatedSchedule });
        } catch (e: any) {
            setError(e.message || 'Failed to generate themes.');
        } finally {
            setIsLoading(false);
        }
    }, [activeSchedule, allPastThemes, updateSchedule]);

    const handleShare = useCallback(async () => {
        if (!activeSchedule || !user || !organization?.clubNumber) {
            if (!organization?.clubNumber) {
                setError("Please set a club number in your profile before you can share schedules.");
            }
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Creating permanent shareable link...');
        setError(null);
        try {
            const scheduleToShare = deepClone(activeSchedule);
            const clubNumber = organization.clubNumber;

            const monthName = new Date(scheduleToShare.year, scheduleToShare.month)
                .toLocaleString('en-US', { month: 'long' })
                .toLowerCase();
            const year = scheduleToShare.year;
            
            const docIdPrefix = `${clubNumber}_${monthName}-${year}-v`;
            
            const querySnapshot = await db.collection('publicSchedules')
                .where(firebase.firestore.FieldPath.documentId(), '>=', docIdPrefix)
                .where(firebase.firestore.FieldPath.documentId(), '<', docIdPrefix + 'z')
                .get();

            let maxVersion = 0;
            querySnapshot.forEach(doc => {
                const docId = doc.id;
                const versionMatch = docId.match(/-v(\d+)$/);
                if (versionMatch) {
                    const version = parseInt(versionMatch[1], 10);
                    if (version > maxVersion) {
                        maxVersion = version;
                    }
                }
            });
            
            const newVersion = maxVersion + 1;
            const humanReadableShareId = `${monthName}-${year}-v${newVersion}`;
            const firestoreDocId = `${clubNumber}_${humanReadableShareId}`;
            
            scheduleToShare.shareId = humanReadableShareId;
            scheduleToShare.isShared = true;
            scheduleToShare.ownerId = user.uid;
            
            const publicMembers = hydratedMembers.filter(m => m.status !== MemberStatus.Archived).map(m => ({ id: m.id, name: m.name }));
            const publicScheduleData = { ...scheduleToShare, publicMembers, clubNumber: organization.clubNumber, clubName: organization.name };
            
            await db.collection('publicSchedules').doc(firestoreDocId).set(publicScheduleData);
            await updateSchedule({ schedule: scheduleToShare });
            
            // Notify all active members about the new schedule
            const monthYear = `${new Date(scheduleToShare.year, scheduleToShare.month).toLocaleString('default', {month: 'long'})} ${scheduleToShare.year}`;
            await notificationService.notifySchedulePublished(
                members.filter(m => m.status === MemberStatus.Active),
                scheduleToShare.id,
                monthYear
            );
            
            const url = new URL(`#/${clubNumber}/share/${humanReadableShareId}`, window.location.origin).toString();
            setShareUrl(url);
            setIsShareModalOpen(true);
        } catch (e: any) {
            setError(e.message || "Could not create shareable link.");
        } finally {
            setIsLoading(false);
        }
    }, [activeSchedule, hydratedMembers, organization, updateSchedule, user]);
    
    const handleCopyToClipboard = useCallback(() => {
        if (!activeSchedule) return;
        const tsv = exportScheduleToTsv(activeSchedule, hydratedMembers, availability);
        navigator.clipboard.writeText(tsv);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    }, [activeSchedule, availability, hydratedMembers]);

    const handleExportToPdf = useCallback(async () => {
        if (!activeSchedule) return;

        setIsLoading(true);
        setLoadingMessage('Generating PDF...');
        
        try {
            const doc = new jsPDF({ orientation: 'portrait' });
            
            const monthYear = new Date(activeSchedule.year, activeSchedule.month).toLocaleString('default', { month: 'long', year: 'numeric' });
            
            // --- Title ---
            doc.setFontSize(22);
            doc.setTextColor(0, 65, 101); // Dark blue color
            doc.setFont('helvetica', 'bold');
            
            // Add club name if available
            const clubName = organization?.name || 'Toastmasters Club';
            doc.text(clubName, 14, 20);
            
            // Add month and year below club name
            doc.setFontSize(18);
            doc.text(`${monthYear} Schedule`, 14, 30);

            // --- Data Preparation ---
            const head = [['Role', ...activeSchedule.meetings.map(m => new Date(m.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }))]];
            
            const themeRowData = ['Theme', ...activeSchedule.meetings.map(m => m.isBlackout ? '---' : (m.theme || ''))];

            const roleRowsData = TOASTMASTERS_ROLES.map(role => [
                role,
                ...activeSchedule.meetings.map(m => {
                    if (m.isBlackout) return 'BLACKOUT';
                    const assignedMemberId = m.assignments[role];
                    return assignedMemberId ? getMemberName(assignedMemberId) : 'Unassigned';
                }),
            ]);
            
            const allMeetingsAvailability = activeSchedule.meetings.map(meeting => {
                if (meeting.isBlackout) {
                    return { unavailable: [], possible: [], available: [] };
                }
                const assignedMemberIds = new Set(Object.values(meeting.assignments).filter(Boolean));
                const lists = { unavailable: [] as string[], possible: [] as string[], available: [] as string[] };
                
                const keyMap = {
                    [AvailabilityStatus.Available]: 'available',
                    [AvailabilityStatus.Unavailable]: 'unavailable',
                    [AvailabilityStatus.Possible]: 'possible',
                } as const;

                hydratedMembers.forEach(member => {
                    if (assignedMemberIds.has(member.id)) return;
                    let finalStatus: AvailabilityStatus;
                    const dateKey = meeting.date.split('T')[0];
                    if (member.status === MemberStatus.Unavailable || member.status === MemberStatus.Archived) {
                        finalStatus = AvailabilityStatus.Unavailable;
                    } else if (member.status === MemberStatus.Possible) {
                        finalStatus = AvailabilityStatus.Possible;
                    } else {
                        finalStatus = availability[member.id]?.[dateKey] || AvailabilityStatus.Available;
                    }
                    
                    const key = keyMap[finalStatus];
                    if (key) {
                        lists[key].push(member.name);
                    }
                });

                lists.unavailable.sort();
                lists.possible.sort();
                lists.available.sort();
                return lists;
            });

            const buildAvailabilityRows = (title: string, key: 'available' | 'possible' | 'unavailable') => {
                const memberLists = allMeetingsAvailability.map(list => list[key]);
                const maxLength = Math.max(0, ...memberLists.map(list => list.length));
                if (maxLength === 0) return [];
                const rows = [];
                for (let i = 0; i < maxLength; i++) {
                    const rowData = memberLists.map(list => list[i] || '');
                    rows.push([i === 0 ? title : '', ...rowData]);
                }
                return rows;
            };

            const availableRows = buildAvailabilityRows('Available (Unassigned)', 'available');
            const possibleRows = buildAvailabilityRows('Possibly Available', 'possible');
            const unavailableRows = buildAvailabilityRows('Unavailable', 'unavailable');
            
            // Calculate consistent column widths
            const pageWidth = 210; // A4 page width in mm
            const margins = 10; // 5mm left + 5mm right
            const availableWidth = pageWidth - margins;
            const roleColumnWidth = 45;
            const numberOfWeeklyColumns = activeSchedule.meetings.length;
            const weeklyColumnWidth = (availableWidth - roleColumnWidth) / numberOfWeeklyColumns;

            // --- Main Schedule Table ---
            (doc as any).autoTable({
                startY: 40,
                head: head,
                body: [themeRowData, ...roleRowsData],
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    halign: 'center',
                    valign: 'middle',
                },
                headStyles: {
                    fillColor: '#004165',
                    textColor: '#FFFFFF',
                    fontStyle: 'bold',
                    halign: 'center',
                },
                columnStyles: Object.assign(
                    { 0: { cellWidth: roleColumnWidth, fontStyle: 'bold', halign: 'left' } },
                    ...Array.from({ length: numberOfWeeklyColumns }, (_, i) => ({
                        [i + 1]: { cellWidth: weeklyColumnWidth }
                    }))
                ),
                margin: { top: 30, right: 5, bottom: 5, left: 5 },
                pageBreak: 'avoid',
                didParseCell: (data: any) => {
                    // Style first "Role" column
                    if (data.column.index === 0) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.halign = 'left';
                    } else {
                        data.cell.styles.halign = 'center';
                    }
                    // Style "Theme" row
                    if (data.row.index === 0 && data.section === 'body') {
                        data.cell.styles.fillColor = '#F3F4F6'; // gray-100
                        data.cell.styles.textColor = '#111827'; // gray-900
                    }
                    // Style "BLACKOUT" cells
                    if (data.cell.raw === 'BLACKOUT') {
                        data.cell.styles.fillColor = '#F3F4F6'; // gray-100
                        data.cell.styles.textColor = '#6B7280'; // gray-500
                        data.cell.styles.fontStyle = 'italic';
                        data.cell.styles.halign = 'center';
                    }
                },
            });
            
            let lastTableY = (doc as any).lastAutoTable.finalY;

            // --- Availability Tables ---
            const allAvailabilityRows = [...availableRows, ...possibleRows, ...unavailableRows];
            
            if (allAvailabilityRows.length > 0) {
                (doc as any).autoTable({
                    startY: lastTableY + 3,
                    body: allAvailabilityRows,
                    theme: 'grid',
                    styles: {
                        fontSize: 8,
                        cellPadding: 2,
                        halign: 'center',
                        valign: 'middle',
                    },
                    columnStyles: Object.assign(
                        { 0: { cellWidth: roleColumnWidth, fontStyle: 'bold', halign: 'left' } },
                        ...Array.from({ length: numberOfWeeklyColumns }, (_, i) => ({
                            [i + 1]: { cellWidth: weeklyColumnWidth }
                        }))
                    ),
                    margin: { top: 3, right: 5, bottom: 5, left: 5 },
                    pageBreak: 'avoid',
                    didParseCell: (data: any) => {
                        const rowIndex = data.row.index;
                        const availableCount = availableRows.length;
                        const possibleCount = possibleRows.length;
                        
                        // Determine which section this row belongs to
                        if (rowIndex < availableCount) {
                            // Available section
                            data.cell.styles.fillColor = '#DCFCE7';
                            data.cell.styles.textColor = '#166534';
                        } else if (rowIndex < availableCount + possibleCount) {
                            // Possible section
                            data.cell.styles.fillColor = '#FEF3C7';
                            data.cell.styles.textColor = '#92400E';
                        } else {
                            // Unavailable section
                            data.cell.styles.fillColor = '#FEE2E2';
                            data.cell.styles.textColor = '#991B1B';
                        }
                        
                        if (data.column.index === 0) {
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.halign = 'left';
                        } else {
                            data.cell.styles.halign = 'center';
                        }
                    }
                });
            }

            // --- Save and Open ---
            const blob = doc.output('blob');
            const blobURL = URL.createObjectURL(blob);
            window.open(blobURL, '_blank');
        } catch (e: any) {
            console.error('PDF generation error:', e);
            setError("Could not generate PDF.");
        } finally {
            setIsLoading(false);
        }
    }, [activeSchedule, hasUnassignedRoles, members, availability]);

    // This function now updates the database directly via the context.
    const handleAssignmentChange = useCallback(async (meetingIndex: number, role: string, newMemberId: string | null) => {
        if (!activeSchedule) return;

        const updatedSchedule = deepClone(activeSchedule);
        const assignments = updatedSchedule.meetings[meetingIndex].assignments;
        const previousMemberId = assignments[role];
        const meeting = updatedSchedule.meetings[meetingIndex];

        // Check if user is unassigning themselves from a speaker role
        if (previousMemberId && !newMemberId && currentUser?.role !== UserRole.Admin) {
            const currentMember = members.find(m => m.id === previousMemberId);
            if (currentMember?.uid === user?.uid && role.includes('Speaker')) {
                // Show confirmation to find replacement
                const shouldContinue = window.confirm(
                    'You are unassigning yourself from a speaker role. Please make sure to find a replacement. ' +
                    'Would you like to continue?'
                );
                if (!shouldContinue) return;

                // Notify evaluator if one is assigned
                const evaluatorRole = role.replace('Speaker', 'Evaluator');
                const evaluatorId = assignments[evaluatorRole];
                if (evaluatorId) {
                    const evaluator = members.find(m => m.id === evaluatorId);
                    if (evaluator?.uid) {
                        await notificationService.notifySpeakerUnassigned(
                            evaluator.uid,
                            role,
                            new Date(meeting.date).toLocaleDateString(),
                            activeSchedule.id
                        );
                    }
                }
            }
        }

        if (newMemberId && MAJOR_ROLES.includes(role)) {
            const currentMajorRole = Object.keys(assignments).find(r =>
                assignments[r] === newMemberId && MAJOR_ROLES.includes(r) && r !== role
            );
            if (currentMajorRole) {
                assignments[currentMajorRole] = null;
            }
        }
        assignments[role] = newMemberId;

        // Send notifications for role changes
        if (previousMemberId !== newMemberId && currentUser?.role === UserRole.Admin) {
            const previousMember = previousMemberId ? organization?.members.find(m => m.id === previousMemberId) : null;
            const newMember = newMemberId ? organization?.members.find(m => m.id === newMemberId) : null;

            await notificationService.notifyRoleChanged(
                previousMember?.uid || null,
                newMember?.uid || null,
                role,
                new Date(meeting.date).toLocaleDateString(),
                activeSchedule.id
            );

            // If role becomes unassigned, notify qualified available/possible members
            if (!newMemberId && previousMemberId) {
                const dateKey = meeting.date.split('T')[0];
                const qualifiedMembers = (organization?.members || []).filter(member => {
                    // Check availability
                    const memberAvailability = availability[member.id];
                    const availStatus = memberAvailability?.[dateKey];
                    if (availStatus !== AvailabilityStatus.Available && availStatus !== AvailabilityStatus.Possible) {
                        return false;
                    }

                    // Check qualifications
                    if (role === 'Toastmaster' && !member.isToastmaster) return false;
                    if (role === 'Table Topics Master' && !member.isTableTopicsMaster) return false;
                    if (role === 'General Evaluator' && !member.isGeneralEvaluator) return false;
                    if (role === 'Inspiration Award' && !member.isPastPresident) return false;

                    // Don't notify members already assigned to this meeting
                    const isAlreadyAssigned = Object.values(assignments).includes(member.id);
                    return !isAlreadyAssigned && member.uid;
                });

                if (qualifiedMembers.length > 0) {
                    await notificationService.notifyRoleUnassigned(
                        qualifiedMembers,
                        role,
                        new Date(meeting.date).toLocaleDateString(),
                        activeSchedule.id
                    );
                }
            }
        }

        await updateSchedule({ schedule: updatedSchedule });
    }, [activeSchedule, updateSchedule, members, availability, currentUser, user]);
    
    const handleThemeChange = useCallback(async (meetingIndex: number, theme: string) => {
        if (!activeSchedule) return;
        const updatedSchedule = deepClone(activeSchedule);
        updatedSchedule.meetings[meetingIndex].theme = theme;
        await updateSchedule({ schedule: updatedSchedule });
    }, [activeSchedule, updateSchedule]);
    
    const handleToggleBlackout = useCallback(async (meetingIndex: number) => {
        if (!activeSchedule) return;
        const updatedSchedule = deepClone(activeSchedule);
        const meeting = updatedSchedule.meetings[meetingIndex];
        const wasBlackout = meeting.isBlackout;
        meeting.isBlackout = !meeting.isBlackout;

        if (meeting.isBlackout) {
            // Store assignments temporarily in a hidden property before clearing them
            (meeting as any)._savedAssignments = { ...meeting.assignments };
            Object.keys(meeting.assignments).forEach(role => {
                meeting.assignments[role] = null;
            });
            
            // Notify all active members about the blackout
            if (!wasBlackout && currentUser?.role === UserRole.Admin) {
                await notificationService.notifyMeetingBlackout(
                    members.filter(m => m.status === MemberStatus.Active),
                    new Date(meeting.date).toLocaleDateString(),
                    activeSchedule.id
                );
            }
        } else {
            // Restore assignments when blackout is disabled
            if ((meeting as any)._savedAssignments) {
                Object.assign(meeting.assignments, (meeting as any)._savedAssignments);
                delete (meeting as any)._savedAssignments;
            }
        }
        await updateSchedule({ schedule: updatedSchedule });
    }, [activeSchedule, updateSchedule, members, currentUser]);


    const renderAvailabilityLists = useCallback((meeting: Meeting) => {
        const assignedMemberIds = new Set(Object.values(meeting.assignments).filter(id => id));
        const dateKey = meeting.date.split('T')[0];
        const memberLists: {unavailable: string[], possible: string[], available: string[]} = { unavailable: [], possible: [], available: [] };

        hydratedMembers.forEach(member => {
            if (assignedMemberIds.has(member.id)) return;
            let finalStatus: AvailabilityStatus;
            if (member.status === MemberStatus.Unavailable || member.status === MemberStatus.Archived) finalStatus = AvailabilityStatus.Unavailable;
            else if (member.status === MemberStatus.Possible) finalStatus = AvailabilityStatus.Possible;
            else finalStatus = availability[member.id]?.[dateKey] || AvailabilityStatus.Available;
            
            if (finalStatus === AvailabilityStatus.Unavailable) memberLists.unavailable.push(member.name);
            else if (finalStatus === AvailabilityStatus.Possible) memberLists.possible.push(member.name);
            else memberLists.available.push(member.name);
        });
    
        return (
            <div className="mt-4 space-y-3">
                <AvailabilityList title="Available" members={memberLists.available.sort()} bgColor="rgba(16, 185, 129, 0.1)" textColor="text-green-800 dark:text-green-300" />
                <AvailabilityList title="Possible" members={memberLists.possible.sort()} bgColor="rgba(245, 158, 11, 0.1)" textColor="text-yellow-800 dark:text-yellow-300" />
                <AvailabilityList title="Unavailable" members={memberLists.unavailable.sort()} bgColor="rgba(239, 68, 68, 0.1)" textColor="text-red-800 dark:text-red-300" />
            </div>
        );
    }, [hydratedMembers, availability]);

    return (
        <>
            <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} shareUrl={shareUrl} />
            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} title="Delete Schedule">
                <p>Are you sure you want to permanently delete this schedule? This action cannot be undone.</p>
            </ConfirmationModal>
            <ConfirmationModal isOpen={isGenerateConfirmOpen} onClose={() => setIsGenerateConfirmOpen(false)} onConfirm={handleConfirmGenerateSchedule} title="Regenerate Schedule?">
                <p>This will overwrite manual assignments. This action cannot be undone.</p>
            </ConfirmationModal>

            {isLoading && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                         <svg className="animate-spin h-8 w-8 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-xl text-white">{loadingMessage}</p>
                    </div>
                </div>
            )}

             {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 my-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        </div>
                        <div className="ml-3"><p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p></div>
                    </div>
                </div>
            )}

            <ScheduleToolbar
                schedules={schedules}
                selectedScheduleId={selectedScheduleId}
                onSelectSchedule={setSelectedScheduleId}
                onDeleteSchedule={() => setIsDeleteModalOpen(true)}
                isAdmin={isAdmin}
                onToggleShowPrevious={() => setShowPreviousMonth(p => !p)}
                showPrevious={showPreviousMonth}
                hasActiveSchedule={!!activeSchedule}
                hasPreviousSchedule={!!previousSchedule}
                onShare={handleShare}
                onCopyToClipboard={handleCopyToClipboard}
                onExportToPdf={handleExportToPdf}
                onGenerateThemes={handleGenerateThemes}
                onGenerateSchedule={() => {
                    setIsGenerateConfirmOpen(true);
                }}
                onPrepareSchedule={handlePrepareSchedule}
                hasUnassignedRoles={hasUnassignedRoles}
                copySuccess={copySuccess}
                meetingDay={organization?.meetingDay}
            />

            {activeSchedule ? (
                <div className="mt-6">
                    <ScheduleTable
                        activeSchedule={activeSchedule}
                        previousScheduleToShow={previousScheduleToShow}
                        activeMembers={activeMembers}
                        availability={availability}
                        isEditable={isAdmin}
                        onThemeChange={handleThemeChange}
                        onToggleBlackout={handleToggleBlackout}
                        onAssignmentChange={handleAssignmentChange}
                        renderAvailabilityLists={renderAvailabilityLists}
                        getMemberName={getMemberName}
                        canEditRoleAssignment={canEditRoleAssignment}
                        canEditTheme={canEditTheme}
                        canToggleBlackout={canToggleBlackout}
                    />
                </div>
            ) : (
                <div className="mt-6 text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create a New Schedule</h3>
                    {organization?.meetingDay !== undefined ? (
                         <div className="mt-6 flex flex-col justify-center items-center gap-4 px-4">
                            {(() => {
                                const nextMonthInfo = getNextScheduleMonth(schedules, organization.meetingDay);
                                const nextMonthExists = Array.isArray(schedules) && schedules.some(s => s.id === `${nextMonthInfo.year}-${String(nextMonthInfo.month + 1).padStart(2, '0')}`);
                                
                                return (
                                    <>
                                        <p className="text-md text-gray-600 dark:text-gray-400">
                                            Ready to generate the schedule for <strong className="text-gray-900 dark:text-white">{nextMonthInfo.displayName}</strong> with AI-powered themes and role assignments.
                                        </p>
                                        <button 
                                            onClick={() => {
                                                handleNewSchedule();
                                            }}
                                            disabled={nextMonthExists || !isAdmin} 
                                            className="w-full sm:w-auto inline-flex items-center justify-center bg-[#004165] hover:bg-[#003554] text-white font-bold py-2 px-4 rounded-md transition duration-150 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed"
                                        >
                                            {nextMonthExists ? 'Schedule Already Exists' : `Generate ${nextMonthInfo.displayName} Schedule`}
                                        </button>
                                    </>
                                );
                            })()}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please set a meeting day in your Club Profile and add members in "Manage Members" before creating schedules.</p>
                    )}
                </div>
            )}
        </>
    );
};