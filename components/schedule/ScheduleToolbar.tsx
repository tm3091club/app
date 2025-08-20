
import React, { useState, useRef, useEffect } from 'react';
import { MonthlySchedule } from '../../types';
import { getNextScheduleMonth, getCurrentMonthInfo } from '../../utils/monthUtils';

interface ScheduleToolbarProps {
  schedules: MonthlySchedule[];
  selectedScheduleId: string | null;
  onSelectSchedule: (id: string | null) => void;
  onDeleteSchedule: () => void;
  onToggleShowPrevious: () => void;
  showPrevious: boolean;
  hasActiveSchedule: boolean;
  hasPreviousSchedule: boolean;
  isAdmin: boolean;
  onShare: () => void;
  onCopyToClipboard: () => void;
  onExportToPdf: () => void;
  onGenerateSchedule: () => void;
  onGenerateThemes: () => void;
  onPrepareSchedule: (type: 'next' | 'previous') => void;
  hasUnassignedRoles: boolean;
  copySuccess: boolean;
  meetingDay?: number;
}

export const ScheduleToolbar: React.FC<ScheduleToolbarProps> = ({
  schedules,
  selectedScheduleId,
  onSelectSchedule,
  onDeleteSchedule,
  onToggleShowPrevious,
  showPrevious,
  hasActiveSchedule,
  hasPreviousSchedule,
  isAdmin,
  onShare,
  onCopyToClipboard,
  onExportToPdf,
  onGenerateSchedule,
  onGenerateThemes,
  onPrepareSchedule,
  hasUnassignedRoles,
  copySuccess,
  meetingDay = 2,
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderExportButton = () => (
    <div className="relative w-full sm:w-auto" ref={exportMenuRef}>
      <button
        onClick={() => setIsExportMenuOpen(prev => !prev)}
        disabled={hasUnassignedRoles}
        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-2 sm:px-4 text-xs sm:text-sm rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto whitespace-nowrap"
        title={hasUnassignedRoles ? "Please assign all major roles to enable export" : "Export Schedule"}
      >
        Export
      </button>
      {isExportMenuOpen && (
        <div
          className="origin-top-right absolute right-0 w-56 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-20 top-full mt-2"
          role="menu"
        >
          <div className="py-1" role="none">
            <button onClick={() => { onCopyToClipboard(); setIsExportMenuOpen(false); }} className="w-full text-left text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600" role="menuitem">
              {copySuccess ? 'Copied!' : 'Copy for Sheets (TSV)'}
            </button>
            <button onClick={() => { onExportToPdf(); setIsExportMenuOpen(false); }} className="w-full text-left text-gray-700 dark:text-gray-200 block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600" role="menuitem">
              Export as PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6 no-print">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div className="flex items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Schedule Manager</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select
            value={selectedScheduleId || ''}
            onChange={e => {
              const value = e.target.value;
              if (value === 'prepare-next') {
                onPrepareSchedule('next');
              } else if (value === 'prepare-previous') {
                onPrepareSchedule('previous');
              } else {
                onSelectSchedule(value || null);
              }
            }}
            className="bg-gray-50 dark:bg-gray-700 !border-2 !border-gray-300 dark:!border-gray-600 rounded-md shadow-sm py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-center sm:text-left sm:pl-3 sm:pr-10 appearance-none w-full sm:min-w-[200px] sm:w-auto"
          >
            <option value="">-- Select a Schedule --</option>
            
            {/* Prepare Previous Option */}
            {(() => {
              if (schedules.length === 0) return null;
              
              // Find the earliest schedule
              const earliestSchedule = schedules.reduce((earliest, schedule) => {
                const earliestDate = new Date(earliest.year, earliest.month);
                const scheduleDate = new Date(schedule.year, schedule.month);
                return scheduleDate < earliestDate ? schedule : earliest;
              });
              
              // Calculate previous month
              let prevYear = earliestSchedule.year;
              let prevMonth = earliestSchedule.month - 1;
              if (prevMonth < 0) {
                prevMonth = 11;
                prevYear--;
              }
              
              const prevMonthId = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
              const prevMonthExists = schedules.some(s => s.id === prevMonthId);
              
              if (!prevMonthExists && isAdmin) {
                const prevMonthName = new Date(prevYear, prevMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
                return (
                  <option key="prepare-previous" value="prepare-previous" className="text-blue-600 dark:text-blue-400">
                    📋 Prepare {prevMonthName}
                  </option>
                );
              }
              return null;
            })()}
            
            {/* Existing Schedules */}
            {schedules
              .sort((a, b) => {
                const dateA = new Date(a.year, a.month);
                const dateB = new Date(b.year, b.month);
                return dateA.getTime() - dateB.getTime();
              })
              .map(s => (
                <option key={s.id} value={s.id}>
                  {new Date(s.year, s.month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            
            {/* Prepare Next Option */}
            {(() => {
              if (!isAdmin) return null;
              
              const nextMonthInfo = getNextScheduleMonth(schedules, meetingDay);
              const nextMonthExists = schedules.some(s => s.id === `${nextMonthInfo.year}-${String(nextMonthInfo.month + 1).padStart(2, '0')}`);
              
              if (!nextMonthExists) {
                return (
                  <option key="prepare-next" value="prepare-next" className="text-blue-600 dark:text-blue-400">
                    📋 Prepare {nextMonthInfo.displayName}
                  </option>
                );
              }
              return null;
            })()}
          </select>
          {isAdmin && (
            <button onClick={onDeleteSchedule} disabled={!selectedScheduleId} title="Delete Schedule" className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100 dark:hover:bg-gray-700 transition-colors self-start sm:self-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
            </button>
          )}
        </div>
      </div>
      {hasActiveSchedule && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Options:</span>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                        <input
                            type="checkbox"
                            checked={showPrevious}
                            onChange={onToggleShowPrevious}
                            disabled={!hasPreviousSchedule}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className={!hasPreviousSchedule ? 'opacity-50' : ''}>Compare with Previous Month</span>
                    </label>
                     {!hasPreviousSchedule && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">(No previous month's schedule found)</span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {isAdmin && (
                        <button onClick={onGenerateThemes} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-2 sm:px-4 text-xs sm:text-sm rounded-md transition flex-1 sm:flex-initial whitespace-nowrap">
                            Generate Themes
                        </button>
                    )}
                    {isAdmin && (
                        <button onClick={onGenerateSchedule} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-2 sm:px-4 text-xs sm:text-sm rounded-md transition flex-1 sm:flex-initial whitespace-nowrap">
                            Generate Schedule
                        </button>
                    )}
                    <button onClick={onShare} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-2 sm:px-4 text-xs sm:text-sm rounded-md transition flex-1 sm:flex-initial whitespace-nowrap">
                        Share
                    </button>
                    <div className="flex-1 sm:flex-initial">
                        {renderExportButton()}
                    </div>
                </div>
            </div>
            {hasUnassignedRoles && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-2 font-semibold">Please assign all major roles before exporting the schedule.</p>
            )}
        </div>
      )}
    </div>
  );
};
