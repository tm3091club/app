
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ScheduleView } from './components/ScheduleView';
import { MemberManager } from './components/MemberManager';
import { ProfilePage } from './components/ProfilePage';
import WeeklyAgenda from './components/WeeklyAgenda';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useAuth } from './Context/AuthContext';
import { AuthPage } from './components/AuthPage';
import { ToastmastersProvider, useToastmasters } from './Context/ToastmastersContext';
import { NotificationProvider } from './Context/NotificationContext';
import { PublicSchedulePage } from './components/PublicSchedulePage';
import { PublicAgendaPage } from './components/PublicAgendaPage';
import { UnsubscribePage } from './components/UnsubscribePage';
import { MentorshipPage } from './components/MentorshipPage';
import { APP_VERSION } from './utils/version';

type View = 'schedule' | 'members' | 'profile' | 'weekly-agenda' | 'mentorship';

function App() {
  const { user, loading, logOut, verifyEmailWithToken } = useAuth();
  const [currentView, setCurrentView] = useState<View>('schedule');

  // --- Top-level Routing Logic ---
  const hash = window.location.hash.substring(1); // Remove the leading '#'
  const publicShareMatch = hash.match(/^\/(\d+)\/share\/([a-zA-Z0-9-]+)/);
  const agendaShareMatch = hash.match(/^\/(\d+)\/agenda\/([a-zA-Z0-9-]+)/);
  // Matches /<club-number>/join or just /join
  const joinMatch = hash.match(/^\/(?:[^/]+\/)?join/);
  // Matches /unsubscribe
  const unsubscribeMatch = hash.match(/^\/unsubscribe/);
  const urlParams = new URLSearchParams(hash.split('?')[1] || '');
  const inviteToken = urlParams.get('token');
  
  // Handle email verification token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verifyToken = urlParams.get('verify');
    
    if (verifyToken && user) {
      verifyEmailWithToken(verifyToken)
        .then(() => {
          // Remove the verification token from URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('verify');
          window.history.replaceState(null, '', newUrl.pathname + newUrl.hash);
          
          // Show success message or redirect
          alert('Email verified successfully! You can now access your club.');
        })
        .catch((error) => {
          alert('Email verification failed. Please try again or contact support.');
        });
    }
  }, [user, verifyEmailWithToken]);

  // Clean up URL if it ends with just a hash
  useEffect(() => {
    if (window.location.hash === '#') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
  // --- End Routing Logic ---
  
  const renderMainApp = () => {
    const WeeklyAgendaWrapper = () => {
      const { selectedScheduleId } = useToastmasters();
      if (!selectedScheduleId) {
        return (
          <div className="p-4 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Please select a monthly schedule first to view the weekly agenda.
            </p>
          </div>
        );
      }
      return (
        <ErrorBoundary>
          <WeeklyAgenda scheduleId={selectedScheduleId} />
        </ErrorBoundary>
      );
    };

    const renderView = () => {
      switch (currentView) {
        case 'schedule':
          return <ScheduleView />;
        case 'members':
          return <MemberManager />;
        case 'profile':
          return <ProfilePage />;
        case 'weekly-agenda':
          return <WeeklyAgendaWrapper />;
        case 'mentorship':
          return <MentorshipPage />;
        default:
          return <ScheduleView />;
      }
    };

    return (
      <ToastmastersProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
            <Header 
                currentView={currentView} 
                setCurrentView={setCurrentView} 
                logOut={logOut} 
                userEmail={user!.email} 
            />
            <main className="p-4 sm:p-6 lg:p-8">
              <div className="max-w-screen-2xl mx-auto">
                {renderView()}
              </div>
            </main>
            {/* Version Footer */}
            <footer className="text-center py-2 px-4">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Version: {APP_VERSION}
              </span>
            </footer>
          </div>
        </NotificationProvider>
      </ToastmastersProvider>
    );
  };

  // Handle unsubscribe route (no authentication required)
  if (unsubscribeMatch) {
    return <UnsubscribePage />;
  }

  // Agenda Share Route - Show shared agenda
  if (agendaShareMatch) {
    const clubNumber = agendaShareMatch[1];
    const shareId = agendaShareMatch[2];
    return <PublicAgendaPage clubNumber={clubNumber} shareId={shareId} />;
  }

  if (publicShareMatch) {
    const clubNumber = publicShareMatch[1];
    const shareId = publicShareMatch[2];
    return <PublicSchedulePage clubNumber={clubNumber} shareId={shareId} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xl text-gray-700 dark:text-gray-300">Initializing Application...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (joinMatch && inviteToken) {
      return <AuthPage isJoinFlow={true} inviteToken={inviteToken} />;
    }
    return <AuthPage />;
  }
  
  // If we reach here, user is authenticated, render the main app.
  return renderMainApp();
}

export default App;