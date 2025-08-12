
import React from 'react';
import { MonthlySchedule } from '../../types';

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
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 no-print">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule Manager</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedScheduleId || ''}
            onChange={e => onSelectSchedule(e.target.value || null)}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center md:text-left md:pl-3 md:pr-10"
          >
            <option value="">-- Select a Schedule --</option>
            {schedules.map(s => (
              <option key={s.id} value={s.id}>
                {new Date(s.year, s.month).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          {isAdmin && (
            <button onClick={onDeleteSchedule} disabled={!selectedScheduleId} title="Delete Schedule" className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100 dark:hover:bg-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
            </button>
          )}
        </div>
      </div>
      {hasActiveSchedule && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center gap-4">
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
        </div>
      )}
    </div>
  );
};
