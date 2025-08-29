import React, { useState, useEffect, useContext, useRef } from 'react';
import { useToastmasters } from '../Context/ToastmastersContext';
import { useAuth } from '../Context/AuthContext';
import { WeeklyAgenda, AgendaItem, MonthlySchedule, Meeting } from '../types';
import { DEFAULT_AGENDA_TEMPLATE, TWO_SPEAKER_TEMPLATE } from '../services/agendaTemplates';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { FileText, Plus, Trash2, ChevronUp, ChevronDown, Info, Share } from 'lucide-react';
import '../styles/WeeklyAgenda.css';
import { exportWeeklyAgendaToPDF, exportWeeklyAgendaToTSV } from '../services/weeklyAgendaExport';
import { ShareModal } from './common/ShareModal';

interface WeeklyAgendaProps {
  scheduleId: string;
}

const WeeklyAgendaComponent: React.FC<WeeklyAgendaProps> = ({ scheduleId }) => {
  const { 
    schedules: monthlySchedules, 
    members, 
    organization,
    weeklyAgendas,
    saveWeeklyAgenda,
    deleteWeeklyAgenda,
    currentUser,
  } = useToastmasters();
  const { user } = useAuth();
  
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [agenda, setAgenda] = useState<WeeklyAgenda | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const schedule = monthlySchedules.find(s => s.id === scheduleId);
  
  // Helper function to check if current user is Toastmaster for this week
  const isToastmasterForWeek = (): boolean => {
    if (!schedule || !user || selectedWeek >= schedule.meetings.length) return false;
    
    const meeting = schedule.meetings[selectedWeek];
    const toastmasterId = meeting.assignments['Toastmaster'];
    
    if (!toastmasterId) return false;
    
    // Find the member assigned as Toastmaster and check if they're linked to current user
    const toastmasterMember = members.find(m => m.id === toastmasterId);
    return toastmasterMember?.uid === user.uid;
  };

  // Helper function to check if user can edit (Admin OR Toastmaster for this week)
  const canEdit = (): boolean => {
    return currentUser?.role === 'Admin' || isToastmasterForWeek();
  };
  
  useEffect(() => {
    if (schedule && schedule.meetings.length > 0) {
      loadOrCreateAgenda();
    }
  }, [selectedWeek, schedule, weeklyAgendas]);

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
        
        // Update theme if changed
        const shouldUpdate = updatedItems.some((item, index) => item !== agenda.items[index]) || 
                           (meeting.theme && meeting.theme !== agenda.theme);
        
        if (shouldUpdate) {
          setAgenda({
            ...agenda,
            theme: meeting.theme || agenda.theme,
            items: updatedItems,
          });
        }
      }
    }
  }, [schedule, selectedWeek, agenda, isEditing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadOrCreateAgenda = () => {
    if (!schedule || selectedWeek >= schedule.meetings.length) return;
    
    const meeting = schedule.meetings[selectedWeek];
    const agendaId = `${scheduleId}-week${selectedWeek + 1}`;
    
    // Check if agenda exists
    const existingAgenda = weeklyAgendas?.find(a => a.id === agendaId);
    
    if (existingAgenda) {
      setAgenda(existingAgenda);
    } else {
      // Create new agenda from template
      const speakerCount = countSpeakers(meeting);
      const template = speakerCount === 2 ? TWO_SPEAKER_TEMPLATE : DEFAULT_AGENDA_TEMPLATE;
      
      // Find previous agenda to copy color scheme
      const previousAgenda = selectedWeek > 0 
        ? weeklyAgendas?.find(a => a.id === `${scheduleId}-week${selectedWeek}`)
        : null;

      const newAgenda: WeeklyAgenda = {
        id: agendaId,
        scheduleId: scheduleId,
        meetingDate: meeting.date,
        theme: meeting.theme || '',
        items: template.items.map(item => {
          // Find matching item in previous agenda by programEvent to copy color
          const matchingPreviousItem = previousAgenda?.items.find(
            prevItem => prevItem.programEvent === item.programEvent
          );
          
          return {
            ...item,
            id: uuidv4(),
            person: getPersonForRole(item.roleKey || '', meeting),
            rowColor: matchingPreviousItem?.rowColor || 'normal', // Copy color from previous agenda or default to normal
          };
        }),
        ownerId: user?.uid,
      };
      
      // Auto-populate next meeting info
      if (selectedWeek < schedule.meetings.length - 1) {
        const nextMeeting = schedule.meetings[selectedWeek + 1];
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
    const member = members.find(m => m.id === memberId);
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
    if (!agenda || !user || !organization?.clubNumber) {
      if (!organization?.clubNumber) {
        console.error("Please set a club number in your profile before you can share agendas.");
      }
      return;
    }
    
    // Temporarily show alert about feature coming soon
    alert("Agenda sharing is coming soon! This feature is being developed and will be available in a future update.");
    return;
    
    try {
      // Create agenda share URL with format: agenda-THEME-month-day-v1
      const meetingDate = new Date(agenda.meetingDate);
      const monthName = meetingDate.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
      const day = meetingDate.getDate();
      const themeSlug = agenda.theme ? agenda.theme.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : 'no-theme';
      
      const shareId = `agenda-${themeSlug}-${monthName}-${day}-v1`;
      const url = `${window.location.origin}/#/${organization.clubNumber}/agenda/${shareId}`;
      
      setShareUrl(url);
      setIsShareModalOpen(true);
    } catch (error) {
      console.error('Error creating share URL:', error);
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
    const meetingDate = new Date(meeting.date);
    exportWeeklyAgendaToPDF(agenda, organization, meetingDate);
  };

  const handleExportTSV = () => {
    if (!agenda) return;
    const meetingDate = new Date(meeting.date);
    exportWeeklyAgendaToTSV(agenda, organization, meetingDate);
    setIsExportMenuOpen(false);
  };

  const handleExportPDFFromMenu = () => {
    handleExportPDF();
    setIsExportMenuOpen(false);
  };

  if (!schedule || schedule.meetings.length === 0) {
    return <div className="p-4">No meetings found in the schedule.</div>;
  }

  const meeting = schedule.meetings[selectedWeek];

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
          {schedule.meetings.map((meeting, index) => (
            <option key={index} value={index}>
              Week {index + 1} - {format(new Date(meeting.date), 'MMMM d, yyyy')}
            </option>
          ))}
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
                      onClick={handleExportTSV}
                      className="w-full text-left text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Export TSV
                    </button>
                    <button
                      onClick={handleExportPDFFromMenu}
                      className="w-full text-left text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Export PDF
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
                loadOrCreateAgenda(); // Reset changes
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
            <p className="text-lg">{format(new Date(meeting.date), 'MMMM d, yyyy')}</p>
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
                {agenda.items.map((item) => {
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
                            disabled={agenda.items.findIndex(i => i.id === item.id) === 0}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveItem(item.id, 'down')}
                            className="text-gray-600 hover:text-gray-800 p-0.5"
                            disabled={agenda.items.findIndex(i => i.id === item.id) === agenda.items.length - 1}
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
