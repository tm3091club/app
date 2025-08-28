
import React, { useState } from 'react';
import { useToastmasters } from '../Context/ToastmastersContext';
import NotificationBell from './NotificationBell';

type View = 'schedule' | 'members' | 'profile' | 'weekly-agenda';

interface HeaderProps {
    currentView: View;
    setCurrentView: (view: View) => void;
    logOut: () => void;
    userEmail: string | null;
}

const NavLink: React.FC<{
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ isActive, onClick, children }) => {
    const activeClasses = 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white';
    const inactiveClasses = 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white';
    return (
        <button
            onClick={onClick}
            className={`block w-full text-left md:w-auto md:text-center px-4 py-3 rounded-md text-base md:text-sm font-semibold md:font-medium transition-colors duration-150 ${isActive ? activeClasses : inactiveClasses}`}
        >
            {children}
        </button>
    );
};

export const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView, logOut, userEmail }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { organization, currentUser } = useToastmasters();

    const handleNavClick = (view: View) => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
    };

    const displayName = organization?.name || userEmail;

    return (
        <header className="bg-white dark:bg-gray-800 shadow-md">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left: Logo & Title */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                             <img src="https://www.toastmasters.org/content/images/globals/toastmasters-logo@2x.png" alt="Toastmasters International Logo" className="h-10 w-auto" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white ml-3">Toastmasters Monthly Scheduler</h1>
                    </div>
                    
                    {/* Right side: Desktop Nav & Mobile menu button */}
                    <div className="flex items-center">
                         {/* Desktop Nav */}
                        <div className="hidden md:flex items-center space-x-4">
                            <NotificationBell onNavigateToAvailability={() => setCurrentView('members')} />
                            <nav className="flex items-baseline space-x-4">
                                <NavLink isActive={currentView === 'schedule'} onClick={() => handleNavClick('schedule')}>Monthly Schedule</NavLink>
                                <NavLink isActive={currentView === 'weekly-agenda'} onClick={() => handleNavClick('weekly-agenda')}>Weekly Agenda</NavLink>
                                <NavLink isActive={currentView === 'members'} onClick={() => handleNavClick('members')}>
                                    {currentUser?.role === 'Admin' ? 'Manage Members' : 'My Availability'}
                                </NavLink>
                            </nav>
                             <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-4"></div>
                             <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => handleNavClick('profile')}
                                    className="text-base font-semibold text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    title={displayName || 'View Profile'}
                                >
                                    {displayName}
                                </button>
                                <button
                                    onClick={logOut}
                                    className="px-4 py-2 text-base font-semibold text-white bg-[#004165] hover:bg-[#003554] rounded-md transition-colors"
                                >
                                    Log Out
                                </button>
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                type="button"
                                className="ml-2 inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-200 hover:text-gray-500 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-indigo-500"
                                aria-controls="mobile-menu"
                                aria-expanded={isMobileMenuOpen}
                            >
                                <span className="sr-only">Open main menu</span>
                                {isMobileMenuOpen ? (
                                     <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu, show/hide based on menu state. */}
            {isMobileMenuOpen && (
                <div className="md:hidden" id="mobile-menu">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {/* Club Name with Profile */}
                        <div className="flex items-center justify-between px-3 py-3 bg-gray-50 dark:bg-gray-700 rounded-md mb-3">
                            <div className="flex items-center gap-3">
                                <span className="text-base font-semibold text-gray-900 dark:text-white truncate">{displayName}</span>
                                <button
                                    onClick={() => handleNavClick('profile')}
                                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-2 py-1 rounded border border-blue-200 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                    Profile
                                </button>
                            </div>
                        </div>
                        
                        {/* Notifications */}
                        <div className="flex items-center justify-between px-3 py-3">
                            <span className="text-base font-semibold text-gray-700 dark:text-gray-300">Notifications</span>
                            <NotificationBell onNavigateToAvailability={() => setCurrentView('members')} />
                        </div>
                        
                        {/* Navigation Links */}
                        <NavLink isActive={currentView === 'schedule'} onClick={() => handleNavClick('schedule')}>Monthly Schedule</NavLink>
                        <NavLink isActive={currentView === 'weekly-agenda'} onClick={() => handleNavClick('weekly-agenda')}>Weekly Agenda</NavLink>
                        <NavLink isActive={currentView === 'members'} onClick={() => handleNavClick('members')}>
                            {currentUser?.role === 'Admin' ? 'Manage Members' : 'My Availability'}
                        </NavLink>
                        
                        <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
                        
                        {/* Log Out */}
                        <div className="px-2 py-2">
                             <button
                                onClick={() => { logOut(); setIsMobileMenuOpen(false); }}
                                className="w-full text-left block px-4 py-3 rounded-md text-base font-semibold text-white bg-[#004165] hover:bg-[#003554] transition-colors"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};
