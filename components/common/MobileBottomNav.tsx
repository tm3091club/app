import React from 'react';
import { Calendar, FileText, User, Users, Settings } from 'lucide-react';

type View = 'schedule' | 'members' | 'profile' | 'weekly-agenda' | 'mentorship';

interface MobileBottomNavProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
        isActive 
          ? 'text-blue-600 dark:text-blue-400' 
          : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      <div className="mb-1">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentView, setCurrentView }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        <NavButton
          icon={<Calendar size={24} />}
          label="Scheduler"
          isActive={currentView === 'schedule'}
          onClick={() => setCurrentView('schedule')}
        />
        <NavButton
          icon={<FileText size={24} />}
          label="Agenda"
          isActive={currentView === 'weekly-agenda'}
          onClick={() => setCurrentView('weekly-agenda')}
        />
        <NavButton
          icon={<User size={24} />}
          label="Availability"
          isActive={currentView === 'members'}
          onClick={() => setCurrentView('members')}
        />
        <NavButton
          icon={<Users size={24} />}
          label="Mentorship"
          isActive={currentView === 'mentorship'}
          onClick={() => setCurrentView('mentorship')}
        />
        <NavButton
          icon={<Settings size={24} />}
          label="Profile"
          isActive={currentView === 'profile'}
          onClick={() => setCurrentView('profile')}
        />
      </div>
    </nav>
  );
};
