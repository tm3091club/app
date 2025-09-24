import React, { useState, useEffect, useContext, useRef } from 'react';
import { useToastmasters } from '../Context/ToastmastersContext';
import { useAuth } from '../Context/AuthContext';
import { WeeklyAgenda, AgendaItem, MonthlySchedule, Meeting, MemberStatus } from '../types';
import { DEFAULT_AGENDA_TEMPLATE, TWO_SPEAKER_TEMPLATE } from '../services/agendaTemplates';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { FileText, Plus, Trash2, ChevronUp, ChevronDown, Info, Share } from 'lucide-react';
import '../styles/WeeklyAgenda.css';
import { exportWeeklyAgendaToPDF, exportWeeklyAgendaToTSV } from '../services/weeklyAgendaExport';
import { ShareModal } from './common/ShareModal';
import { db } from '../services/firebase';
import firebase from 'firebase/compat/app';

interface WeeklyAgendaProps {
  scheduleId: string;
}

const WeeklyAgendaComponent: React.FC<WeeklyAgendaProps> = ({ scheduleId }) => {
  const { 
    schedules: monthlySchedules, 
    organization,
    weeklyAgendas,
    saveWeeklyAgenda,
    deleteWeeklyAgenda,
    currentUser,
    adminStatus,
  } = useToastmasters();
  const { user } = useAuth();
  
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [agenda, setAgenda] = useState<WeeklyAgenda | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const schedule = monthlySchedules.find(s => s.id === scheduleId);
  
  // Function to automatically determine which week to display
  const getDefaultWeek = (): number => {
    if (!schedule || schedule.meetings.length === 0) return 0;
    
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Simple logic: find the next upcoming meeting or current week
    for (let i = 0; i < schedule.meetings.length; i++) {
      const meeting = schedule.meetings[i];
      if (!meeting.date) continue; // Skip meetings with invalid dates
      
      const meetingDate = new Date(meeting.date + 'T00:00:00');
      if (isNaN(meetingDate.getTime())) continue; // Skip invalid dates
      
      const meetingDateOnly = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());
      
      // If meeting is today or in the future, show this week
      if (meetingDateOnly >= currentDate) {
        return i;
      }
    }
    
    // If all meetings are in the past, show the last week
    return Math.max(0, schedule.meetings.length - 1);
  };
  
  // Helper function to check if current user is Toastmaster for this week
  const isToastmasterForWeek = (): boolean => {
    if (!schedule || !user || selectedWeek >= schedule.meetings.length) return false;
    
    const meeting = schedule.meetings[selectedWeek];
    const toastmasterId = meeting.assignments['Toastmaster'];
    
    if (!toastmasterId) return false;
    
    // Find the member assigned as Toastmaster and check if they're linked to current user
    const toastmasterMember = organization?.members.find(m => m.id === toastmasterId);
    return toastmasterMember?.uid === user.uid;
  };

  // Helper function to check if user can edit (Admin OR Toastmaster for this week)
  const canEdit = (): boolean => {
    return adminStatus?.hasAdminRights || isToastmasterForWeek();
  };
  
  // Update selected week when schedule changes or loads
  useEffect(() => {
    if (schedule && schedule.meetings.length > 0) {
      const defaultWeek = getDefaultWeek();
      setSelectedWeek(defaultWeek);
    }
  }, [schedule?.id]); // When schedule ID changes

  useEffect(() => {
    if (schedule && schedule.meetings.length > 0) {
      loadOrCreateAgenda();
    }
  }, [selectedWeek, schedule?.id]); // Removed weeklyAgendas dependency to prevent unwanted reloads

  // Auto-sync when schedule changes (real-time)
  useEffect(() => {
    if (agenda && schedule && !isEditing) {
      const meeting = schedule.meetings[selectedWeek];
      if (meeting) {
        // Auto-update person assignments for role-bound items
        const updatedItems = agenda.items.map(item => {
          if (item.roleKey && !item.isManualOverride) {
            const newPerson = getPersonForRole(item.roleKey, meeting);
            if (newPerson !== item.person) {
              return { ...item, person: newPerson };
            }
          }
          return item;
        });
        
        // Update next meeting info based on current week
        let nextMeeting = null;
        let newNextMeetingInfo = null;
        
        // First, try to find next meeting within the same month
        if (selectedWeek < schedule.meetings.length - 1) {
          nextMeeting = schedule.meetings[selectedWeek + 1];
        } else {
          // If this is the last week of the month, look for next month's schedule
          const currentDate = new Date(schedule.year, schedule.month);
          const nextMonthDate = new Date(currentDate);
          nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
          
          const nextMonthScheduleId = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
          const nextMonthSchedule = Array.isArray(monthlySchedules) ? monthlySchedules.find(s => s.id === nextMonthScheduleId) : null;
          
          if (nextMonthSchedule && nextMonthSchedule.meetings.length > 0) {
            // Use the first meeting of next month
            nextMeeting = nextMonthSchedule.meetings[0];
          }
        }
        
        if (nextMeeting) {
          newNextMeetingInfo = {
            toastmaster: getMemberName(nextMeeting.assignments['Toastmaster']),
            speakers: [
              getMemberName(nextMeeting.assignments['Speaker 1']),
              getMemberName(nextMeeting.assignments['Speaker 2']),
              getMemberName(nextMeeting.assignments['Speaker 3']),
            ].filter(Boolean),
            tableTopicsMaster: getMemberName(nextMeeting.assignments['Table Topics Master']),
            isManualOverride: false,
          };
        }
        
        // Update theme and meeting date if changed
        const shouldUpdate = updatedItems.some((item, index) => item !== agenda.items[index]) || 
                           (meeting.theme && meeting.theme !== agenda.theme) ||
                           JSON.stringify(newNextMeetingInfo) !== JSON.stringify(agenda.nextMeetingInfo) ||
                           (meeting.date && meeting.date !== agenda.meetingDate);
        
        if (shouldUpdate) {
          setAgenda({
            ...agenda,
            theme: meeting.theme || agenda.theme,
            items: updatedItems,
            nextMeetingInfo: newNextMeetingInfo,
            meetingDate: meeting.date || agenda.meetingDate,
          });
        }
      }
    }
  }, [schedule, selectedWeek, agenda, isEditing, monthlySchedules]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOrCreateAgenda = (forceReload = false) => {
    if (!schedule || selectedWeek >= schedule.meetings.length) return;
    
    const meeting = schedule.meetings[selectedWeek];
    if (!meeting || !meeting.date) return; // Skip if meeting data is invalid
    const agendaId = `${scheduleId}-week${selectedWeek + 1}`;
    
    // Check if agenda exists
    const existingAgenda = Array.isArray(weeklyAgendas) ? weeklyAgendas.find(a => a.id === agendaId) : null;
    
    if (existingAgenda && !forceReload) {
      setAgenda(existingAgenda);
    } else {
      // Create new agenda from template
      const speakerCount = countSpeakers(meeting);
      const template = speakerCount === 2 ? TWO_SPEAKER_TEMPLATE : DEFAULT_AGENDA_TEMPLATE;
      
      // Find previous agenda to copy color scheme
      const previousAgenda = selectedWeek > 0 
        ? (Array.isArray(weeklyAgendas) ? weeklyAgendas.find(a => a.id === `${scheduleId}-week${selectedWeek}`) : null)
        : null;

      const newAgenda: WeeklyAgenda = {
        id: agendaId,
        scheduleId: scheduleId,
        meetingDate: meeting.date,
        theme: meeting.theme || '',
        items: template.items.map(item => {
          // Find matching item in previous agenda by programEvent to copy color
          const matchingPreviousItem = previousAgenda?.items?.find(
            prevItem => prevItem.programEvent === item.programEvent
          );
          
          return {
            ...item,
            id: uuidv4(),
            person: getPersonForRole(item.roleKey || '', meeting),
            rowColor: matchingPreviousItem?.rowColor || item.rowColor || 'normal', // Copy color from previous agenda, then template, then default to normal
          };
        }),
        ownerId: user?.uid,
      };
      
      // Auto-populate next meeting info
      let nextMeeting = null;
      
      // First, try to find next meeting within the same month
      if (selectedWeek < schedule.meetings.length - 1) {
        nextMeeting = schedule.meetings[selectedWeek + 1];
      } else {
        // If this is the last week of the month, look for next month's schedule
        const currentDate = new Date(schedule.year, schedule.month);
        const nextMonthDate = new Date(currentDate);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        
        const nextMonthScheduleId = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
        const nextMonthSchedule = Array.isArray(monthlySchedules) ? monthlySchedules.find(s => s.id === nextMonthScheduleId) : null;
        
        if (nextMonthSchedule && nextMonthSchedule.meetings.length > 0) {
          // Use the first meeting of next month
          nextMeeting = nextMonthSchedule.meetings[0];
        }
      }
      
      if (nextMeeting) {
        newAgenda.nextMeetingInfo = {
          toastmaster: getMemberName(nextMeeting.assignments['Toastmaster']),
          speakers: [
            getMemberName(nextMeeting.assignments['Speaker 1']),
            getMemberName(nextMeeting.assignments['Speaker 2']),
            getMemberName(nextMeeting.assignments['Speaker 3']),
          ].filter(Boolean),
          tableTopicsMaster: getMemberName(nextMeeting.assignments['Table Topics Master']),
          isManualOverride: false,
        };
      }
      
      setAgenda(newAgenda);
    }
  };

  const countSpeakers = (meeting: Meeting): number => {
    let count = 0;
    if (meeting.assignments['Speaker 1']) count++;
    if (meeting.assignments['Speaker 2']) count++;
    if (meeting.assignments['Speaker 3']) count++;
    return count;
  };

  const getPersonForRole = (roleKey: string, meeting: Meeting): string => {
    if (!roleKey || !meeting.assignments[roleKey]) return '';
    return getMemberName(meeting.assignments[roleKey]);
  };

  const getMemberName = (memberId: string | null): string => {
    if (!memberId) return '';
    const member = organization?.members.find(m => m.id === memberId);
    return member?.name || '';
  };

  const handleItemChange = (itemId: string, field: keyof AgendaItem, value: string) => {
    if (!agenda) return;
    
    setAgenda({
      ...agenda,
      items: agenda.items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              [field]: value,
              ...(field === 'person' && item.roleKey ? { isManualOverride: true } : {})
            }
          : item
      ),
    });
  };

  const handleSave = async () => {
    if (!agenda || !saveWeeklyAgenda) return;
    
    setIsSaving(true);
    try {
      await saveWeeklyAgenda(agenda);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving agenda:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    // Share button clicked
    
    if (!agenda || !user || !organization?.clubNumber) {
      if (!agenda) {
        alert("No agenda found. Please make sure the agenda is loaded.");
        return;
      }
      if (!user) {
        alert("You must be logged in to share agendas.");
        return;
      }
      if (!organization?.clubNumber) {
        alert("Please set a club number in your profile before you can share agendas.");
        return;
      }
      return;
    }
    
    // Starting share process
    setIsSaving(true);
    
    try {
      const agendaToShare = { ...agenda };
      const clubNumber = organization.clubNumber;
      
      // Creating share ID
      
      // Create share ID with format: agenda-THEME-month-day-vX
      const meetingDate = agenda.meetingDate ? new Date(agenda.meetingDate) : new Date();
      const isValidDate = !isNaN(meetingDate.getTime());
      const monthName = isValidDate ? meetingDate.toLocaleDateString('en-US', { month: 'long' }).toLowerCase() : 'unknown';
      const day = isValidDate ? meetingDate.getDate() : 1;
      const year = meetingDate.getFullYear();
      const themeSlug = agenda.theme ? agenda.theme.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : 'no-theme';
      
      const docIdPrefix = `${clubNumber}_agenda-${themeSlug}-${monthName}-${day}-${year}-v`;
      // Check for existing versions
      const querySnapshot = await db.collection('publicAgendas')
        .where(firebase.firestore.FieldPath.documentId(), '>=', docIdPrefix)
        .where(firebase.firestore.FieldPath.documentId(), '<', docIdPrefix + 'z')
        .get();
      
      // Query completed for existing versions

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
      const humanReadableShareId = `${themeSlug}-${monthName}-${day}-${year}-v${newVersion}`;
      const firestoreDocId = `${clubNumber}_${humanReadableShareId}`;
      
      // Creating version and share ID
      
      // Mark agenda as shared
      agendaToShare.shareId = humanReadableShareId;
      agendaToShare.isShared = true;
      agendaToShare.ownerId = user.uid;
      
      // Create public agenda data
      const publicAgendaData = {
        ...agendaToShare,
        clubNumber: organization.clubNumber,
        clubName: organization.name,
      };
      
      // Save to publicAgendas collection
      await db.collection('publicAgendas').doc(firestoreDocId).set(publicAgendaData);
      
      // Update the local agenda with sharing info
      if (saveWeeklyAgenda) {
        // Updating local agenda
        await saveWeeklyAgenda(agendaToShare);
      }
      
      // Create share URL
      const url = `${window.location.origin}/#/${clubNumber}/agenda/${humanReadableShareId}`;
      setShareUrl(url);
      setIsShareModalOpen(true);
      // Share completed successfully
      
    } catch (error) {
      console.error('Error creating share URL:', error);
      console.error('Full error details:', error);
      alert(`Failed to create shareable link: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddItem = () => {
    if (!agenda) return;
    
    const newItem: AgendaItem = {
      id: uuidv4(),
      time: '',
      programEvent: '',
      person: '',
      description: '',
      rowColor: 'normal',
    };
    
    setAgenda({
      ...agenda,
      items: [...agenda.items, newItem],
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!agenda) return;
    
    setAgenda({
      ...agenda,
      items: agenda.items.filter(item => item.id !== itemId),
    });
  };

  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    if (!agenda) return;
    
    const items = [...agenda.items];
    const currentIndex = items.findIndex(item => item.id === itemId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= items.length) return;
    
    // Swap items
    [items[currentIndex], items[newIndex]] = [items[newIndex], items[currentIndex]];
    
    setAgenda({
      ...agenda,
      items,
    });
  };

  const handleExportPDF = async () => {
    if (!agenda) return;
    const meetingDate = meeting.date ? new Date(meeting.date + 'T00:00:00') : new Date();
    if (isNaN(meetingDate.getTime())) {
      console.warn('Invalid meeting date for PDF export');
      return;
    }
    exportWeeklyAgendaToPDF(agenda, organization, meetingDate);
  };

  const handleCopyToClipboard = () => {
    if (!agenda) return;
    const meetingDate = meeting.date ? new Date(meeting.date + 'T00:00:00') : new Date();
    if (isNaN(meetingDate.getTime())) {
      console.warn('Invalid meeting date for TSV export');
      return;
    }
    const tsv = exportWeeklyAgendaToTSV(agenda, organization, meetingDate);
    navigator.clipboard.writeText(tsv);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    setIsExportMenuOpen(false);
  };

  const handleExportPDFFromMenu = () => {
    handleExportPDF();
    setIsExportMenuOpen(false);
  };

  // Check if schedule exists and has meetings
  if (!schedule || schedule.meetings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
            No Schedule Generated Yet
          </h3>
          <p className="text-yellow-700 dark:text-yellow-400 mb-4">
            You need to generate a schedule first before you can view the weekly agenda.
          </p>
          <p className="text-sm text-yellow-600 dark:text-yellow-500">
            Go to the Scheduler tab and click "Generate Schedule" to automatically assign members to roles.
          </p>
        </div>
      </div>
    );
  }

  // Check if schedule is prepared but not generated (has meetings but no role assignments)
  const hasAnyRoleAssignments = schedule.meetings.some(meeting => 
    Object.values(meeting.assignments).some(assignment => assignment !== null)
  );

  if (!hasAnyRoleAssignments) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
            Schedule Prepared - Ready to Generate
          </h3>
          <p className="text-blue-700 dark:text-blue-400 mb-4">
            Your schedule is prepared with meeting dates, but you need to generate role assignments.
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-500">
            Go back to the Scheduler tab and click "Generate Schedule" to automatically assign members to roles for each meeting.
          </p>
        </div>
      </div>
    );
  }

  const meeting = schedule.meetings[selectedWeek];

  if (!agenda) {
    return <div className="p-4">Loading weekly agenda...</div>;
  }

  return (
    <>
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} shareUrl={shareUrl} />
      <div className="max-w-7xl mx-auto p-4 print:p-0">
      {/* Week Selector - Hide in print */}
      <div className="mb-6 print:hidden">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Week
        </label>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          {schedule.meetings.map((meeting, index) => {
            // Validate date before formatting
            const meetingDate = meeting.date ? new Date(meeting.date + 'T00:00:00') : null;
            const isValidDate = meetingDate && !isNaN(meetingDate.getTime());
            
            return (
              <option key={index} value={index}>
                Week {index + 1} - {isValidDate ? format(meetingDate, 'MMMM d, yyyy') : 'Invalid Date'}
              </option>
            );
          })}
        </select>
      </div>

      {/* Instructions Panel - Hide in print */}
      {isEditing && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg print:hidden">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-2">Editing Instructions:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><span className="font-medium">Permissions:</span> Admins and the assigned Toastmaster for this week can edit the agenda</li>
                <li><span className="font-medium">Row Colors:</span> Set Normal (white), Highlight (blue), or Space (red, left-aligned). New agendas copy colors from previous week.</li>
                <li><span className="font-medium">Move Rows:</span> Use ↑↓ arrows to reorder agenda items</li>
                <li><span className="font-medium">Role Binding:</span> Items linked to roles auto-update member assignments automatically</li>
                <li><span className="font-medium">Time Format:</span> Use start times like "7:00" or ranges like "7:00-7:05"</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Hide in print */}
      <div className="mb-6 print:hidden">
        <div className="flex flex-wrap gap-2 md:gap-3">
        {!isEditing ? (
          <>
            {/* Admin or Toastmaster buttons */}
            {canEdit() && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 md:py-2 md:px-4 text-xs md:text-sm rounded-md transition whitespace-nowrap"
                >
                  Edit Agenda
                </button>

              </>
            )}
            {/* Share button */}
            <button
              onClick={handleShare}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1.5 px-3 md:py-2 md:px-4 text-xs md:text-sm rounded-md transition whitespace-nowrap"
            >
              Share
            </button>
            
            {/* Export dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setIsExportMenuOpen(prev => !prev)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1.5 px-3 md:py-2 md:px-4 text-xs md:text-sm rounded-md transition whitespace-nowrap"
              >
                Export
              </button>
              {isExportMenuOpen && (
                <div className="origin-top-right absolute right-0 w-56 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-20 top-full mt-2">
                  <div className="py-1">
                    <button
                      onClick={handleExportPDFFromMenu}
                      className="w-full text-left text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Export PDF
                    </button>
                    <button
                      onClick={handleCopyToClipboard}
                      className="w-full text-left text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {copySuccess ? 'Copied!' : 'Copy for Sheets (TSV)'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-3 md:py-2 md:px-4 text-xs md:text-sm rounded-md transition disabled:opacity-50 whitespace-nowrap"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                // Only reload if no existing agenda, otherwise keep current agenda
                const agendaId = `${scheduleId}-week${selectedWeek + 1}`;
                const existingAgenda = Array.isArray(weeklyAgendas) ? weeklyAgendas.find(a => a.id === agendaId) : null;
                if (!existingAgenda) {
                  loadOrCreateAgenda();
                }
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1.5 px-3 md:py-2 md:px-4 text-xs md:text-sm rounded-md transition whitespace-nowrap"
            >
              Cancel
            </button>

          </>
        )}
        </div>
      </div>

      {/* Agenda Content */}
      {agenda && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="p-6 print:p-8 text-center border-b dark:border-gray-700 print:border-0">
            <h1 className="text-2xl font-bold mb-2">{organization?.name || 'Toastmasters Club'}</h1>
            <p className="text-lg mb-2">Club #{organization?.clubNumber || 'XXXXX'}</p>
            <h2 className="text-xl font-semibold mb-2">Meeting Agenda</h2>
            <p className="text-lg">
              {(() => {
                if (!meeting.date) return 'Date TBD';
                const meetingDate = new Date(meeting.date + 'T00:00:00');
                return isNaN(meetingDate.getTime()) ? 'Invalid Date' : format(meetingDate, 'MMMM d, yyyy');
              })()}
            </p>
            {agenda.theme && (
              <p className="text-lg mt-2 font-medium agenda-theme">Theme: {agenda.theme}</p>
            )}
          </div>

          {/* Agenda Table */}
          <div className="p-2 md:p-4 print:p-6">
            {/* FONT SIZE ADJUSTMENT: Change text-sm to text-base or text-lg for larger fonts on desktop */}
            <table className="w-full border-collapse text-xs md:text-base">
              <thead>
                <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="text-left py-0.5 px-1 md:py-1 md:px-2 w-16">Time</th>
                  <th className="text-left py-0.5 px-1 md:py-1 md:px-2 w-1/3">Program Event</th>
                  <th className="text-center py-0.5 px-1 md:py-1 md:px-2 hidden md:table-cell">Member</th>
                  <th className="text-center py-0.5 px-1 md:py-1 md:px-2 hidden md:table-cell">Description of Role or Task</th>
                  <th className="text-center py-0.5 px-1 md:py-1 md:px-2 md:hidden">Member / Description</th>
                  {isEditing && canEdit() && <th className="w-24 print:hidden">Color</th>}
                  {isEditing && canEdit() && <th className="w-16 print:hidden">Move</th>}
                  {isEditing && canEdit() && <th className="w-10 print:hidden">Delete</th>}
                </tr>
              </thead>
              <tbody>
                {agenda?.items?.map((item) => {
                  // Determine row color from manual selection only
                  let rowColorClass = '';
                  let isVotingRow = false;
                  
                  if (item.rowColor === 'highlight') {
                    rowColorClass = 'bg-blue-50 dark:bg-blue-900/20';
                  } else if (item.rowColor === 'space') {
                    rowColorClass = 'bg-red-50 dark:bg-red-900/20';
                    isVotingRow = true; // Keep the red styling
                  }
                  // Default: normal (no color) - rowColorClass stays empty
                  
                  return (
                    <tr key={item.id} className={`border-b border-gray-200 dark:border-gray-700 ${rowColorClass}`}>
                      <td className="py-0.5 px-1 md:py-1 md:px-2 align-top" style={{ verticalAlign: 'top' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.time}
                          onChange={(e) => handleItemChange(item.id, 'time', e.target.value)}
                          className="w-full px-1 py-0.5 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                          placeholder="7:00"
                        />
                      ) : (
                        item.time
                      )}
                    </td>
                    {item.rowColor === 'space' ? (
                      // Space row: merge content columns but keep structure consistent
                      <>
                        <td className="py-0.5 px-1 md:py-1 md:px-2 text-left" style={{ verticalAlign: 'top' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.programEvent || item.person || item.description}
                              onChange={(e) => {
                                // Store the text in programEvent and clear others
                                handleItemChange(item.id, 'programEvent', e.target.value);
                                handleItemChange(item.id, 'person', '');
                                handleItemChange(item.id, 'description', '');
                              }}
                              className="w-full px-1 py-0.5 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                              placeholder="Enter text..."
                            />
                          ) : (
                            <span className="font-medium text-red-600 dark:text-red-400 block break-words overflow-hidden">
                              {item.programEvent || item.person || item.description}
                            </span>
                          )}
                        </td>
                        {/* Empty cells for Member and Description columns to maintain structure */}
                        <td className="py-0.5 px-1 md:py-1 md:px-2 hidden md:table-cell" style={{ verticalAlign: 'top' }}></td>
                        <td className="py-0.5 px-1 md:py-1 md:px-2 hidden md:table-cell" style={{ verticalAlign: 'top' }}></td>
                      </>
                    ) : (
                      // Normal row: separate columns
                      <>
                        <td className="py-0.5 px-1 md:py-1 md:px-2 align-top" style={{ verticalAlign: 'top' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.programEvent}
                              onChange={(e) => handleItemChange(item.id, 'programEvent', e.target.value)}
                              className="w-full px-1 py-0.5 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                            />
                          ) : (
                            <span className={`font-medium ${isVotingRow ? 'text-red-600 dark:text-red-400' : ''}`}>{item.programEvent}</span>
                          )}
                        </td>
                        {/* Desktop: separate columns */}
                        <td className="py-0.5 px-1 md:py-1 md:px-2 text-center hidden md:table-cell" style={{ verticalAlign: 'top' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.person}
                              onChange={(e) => handleItemChange(item.id, 'person', e.target.value)}
                              className="w-full px-1 py-0.5 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                            />
                          ) : (
                            item.person
                          )}
                        </td>
                        <td className="py-0.5 px-1 md:py-1 md:px-2 hidden md:table-cell text-center" style={{ verticalAlign: 'top' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              className="w-full px-1 py-0.5 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm text-center"
                            />
                          ) : (
                            item.description
                          )}
                        </td>
                      </>
                    )}
                    {/* Mobile: combined column */}
                    <td className="py-0.5 px-1 md:py-1 md:px-2 text-center md:hidden">
                      {item.rowColor === 'space' ? (
                        // Space row mobile: empty since content shows in Program Event column
                        null
                      ) : (
                        // Normal row mobile
                        isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={item.person}
                              onChange={(e) => handleItemChange(item.id, 'person', e.target.value)}
                              className="w-full px-1 py-0.5 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm text-center"
                              placeholder="Member Name"
                            />
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              className="w-full px-1 py-0.5 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm text-center"
                              placeholder="Description"
                            />
                          </div>
                        ) : (
                          <div className="text-center">
                            {item.person && <div className="font-medium">{item.person}</div>}
                            {item.description && <div className="text-xs text-gray-600 dark:text-gray-400">{item.description}</div>}
                          </div>
                        )
                      )}
                    </td>
                    {/* Color Selection */}
                    {isEditing && canEdit() && (
                      <td className="py-0.5 px-1 md:py-1 md:px-2 print:hidden" style={{ verticalAlign: 'top' }}>
                        <select
                          value={item.rowColor || 'normal'}
                          onChange={(e) => handleItemChange(item.id, 'rowColor', e.target.value)}
                          className="w-20 px-1 py-0.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                        >
                          <option value="normal">Normal</option>
                          <option value="highlight">Highlight</option>
                          <option value="space">Space</option>
                        </select>
                      </td>
                    )}
                    
                    {/* Move Buttons */}
                    {isEditing && canEdit() && (
                      <td className="py-0.5 px-1 md:py-1 md:px-2 print:hidden" style={{ verticalAlign: 'top' }}>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveItem(item.id, 'up')}
                            className="text-gray-600 hover:text-gray-800 p-0.5"
                            disabled={agenda?.items?.findIndex(i => i.id === item.id) === 0}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveItem(item.id, 'down')}
                            className="text-gray-600 hover:text-gray-800 p-0.5"
                            disabled={agenda?.items?.findIndex(i => i.id === item.id) === (agenda?.items?.length || 0) - 1}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    )}
                    
                    {/* Delete Button */}
                    {isEditing && canEdit() && (
                      <td className="py-0.5 px-1 md:py-1 md:px-2 print:hidden" style={{ verticalAlign: 'top' }}>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 hover:text-red-800 p-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Add Item Button - Under the table in Time column */}
            {isEditing && canEdit() && (
              <div className="mt-2">
                <button
                  onClick={handleAddItem}
                  className="ml-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 print:p-6 border-t dark:border-gray-700 print:border-0 agenda-footer">
            {agenda.nextMeetingInfo && (
              <p className="mb-1 text-sm">
                <strong>Next Meeting:</strong> TM: {agenda.nextMeetingInfo.toastmaster}, 
                Speakers: {agenda.nextMeetingInfo.speakers.join(', ')}, 
                TT: {agenda.nextMeetingInfo.tableTopicsMaster}
              </p>
            )}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Website: 
              {isEditing ? (
                <input
                  type="text"
                  value={agenda.websiteUrl || `${window.location.origin} tmapp.club`}
                  onChange={(e) => setAgenda({ ...agenda, websiteUrl: e.target.value })}
                  className="ml-2 px-2 py-0.5 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
                  placeholder="Enter website URL"
                />
              ) : (
                <span className="ml-1">{agenda.websiteUrl || `${window.location.origin} tmapp.club`}</span>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default WeeklyAgendaComponent;
