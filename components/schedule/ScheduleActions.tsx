
import React, { useState, useRef, useEffect } from 'react';

interface ScheduleActionsProps {
  isAdmin: boolean;
  hasUnassignedRoles: boolean;
  onGenerateThemes: () => void;
  onGenerateSchedule: () => void;
  onShare: () => void;
  onCopyToClipboard: () => void;
  onExportToPdf: () => void;
  copySuccess: boolean;
  isMobile: boolean;
}

export const ScheduleActions: React.FC<ScheduleActionsProps> = ({
  isAdmin,
  hasUnassignedRoles,
  onGenerateThemes,
  onGenerateSchedule,
  onShare,
  onCopyToClipboard,
  onExportToPdf,
  copySuccess,
  isMobile,
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
    <div className="relative" ref={exportMenuRef}>
      <button
        onClick={() => setIsExportMenuOpen(prev => !prev)}
        disabled={hasUnassignedRoles}
        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex-grow sm:flex-grow-0"
        title={hasUnassignedRoles ? "Please assign all major roles to enable export" : "Export Schedule"}
      >
        Export
      </button>
      {isExportMenuOpen && (
        <div
          className="origin-top-right md:origin-bottom-right absolute right-0 w-56 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-10 top-full mt-2 md:top-auto md:bottom-full md:mb-2 md:mt-0"
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

  const adminButtons = (
    <>
      <button onClick={onGenerateThemes} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-md transition text-sm text-center">Generate Themes</button>
      <button onClick={onGenerateSchedule} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition text-sm text-center">Generate Schedule</button>
    </>
  );

  const adminButtonsDesktop = (
     <>
      <button onClick={onGenerateThemes} className="flex-grow sm:flex-grow-0 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition">Generate Themes</button>
      <button onClick={onGenerateSchedule} className="flex-grow sm:flex-grow-0 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition">Generate Schedule</button>
    </>
  );

  if (isMobile) {
    return (
      <div className="md:hidden mt-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
              {isAdmin && adminButtons}
              <button onClick={onShare} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-md transition text-sm text-center">Share</button>
              <div className={isAdmin ? "" : "col-span-2"}>
                {renderExportButton()}
              </div>
              {hasUnassignedRoles && <p className="col-span-2 text-xs text-red-500 dark:text-red-400 mt-1 text-center">Assign all major roles to export.</p>}
          </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 mt-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-lg hidden md:flex flex-col items-center justify-center gap-2 no-print">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {isAdmin && adminButtonsDesktop}
        <button onClick={onShare} className="flex-grow sm:flex-grow-0 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md transition">Share</button>
        {renderExportButton()}
      </div>
      {hasUnassignedRoles && <p className="text-sm text-red-500 dark:text-red-400 mt-2 font-semibold">Please assign all major roles before exporting the schedule.</p>}
    </div>
  );
};
