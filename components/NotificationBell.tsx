import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import { useNotifications } from '../Context/NotificationContext';

interface NotificationBellProps {
  onNavigateToAvailability?: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigateToAvailability }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotifications();

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        bellRef.current &&
        !bellRef.current.contains(event.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsPanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="relative p-2 bg-transparent dark:bg-transparent text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] dark:focus:ring-offset-gray-800 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isPanelOpen && (
        <div ref={panelRef}>
          <NotificationPanel 
            onClose={() => setIsPanelOpen(false)} 
            onNavigateToAvailability={onNavigateToAvailability}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
