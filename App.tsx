
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
import { TermsOfServicePage } from './components/TermsOfServicePage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { APP_VERSION } from './utils/version';
import { db } from './services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { BUG_REPORT_EMAIL } from './Constants';
import { MobileBottomNav } from './components/common/MobileBottomNav';

type View = 'schedule' | 'members' | 'profile' | 'weekly-agenda' | 'mentorship';

const BugReportModal: React.FC<{ isOpen: boolean; onClose: () => void; userEmail: string }> = ({ isOpen, onClose, userEmail }) => {
  const [bugReport, setBugReport] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!bugReport.trim()) return;
    
    setSending(true);
    try {
      await addDoc(collection(db, 'mail'), {
        to: [BUG_REPORT_EMAIL],
        replyTo: userEmail,
        message: {
          subject: `Bug Report from ${userEmail}`,
          text: bugReport,
          html: `
            <h3>Bug Report</h3>
            <p><strong>From:</strong> ${userEmail}</p>
            <p><strong>Version:</strong> ${APP_VERSION}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <hr>
            <p><strong>Report:</strong></p>
            <p>${bugReport.replace(/\n/g, '<br>')}</p>
          `
        }
      });
      
      alert('Bug report sent successfully! Thank you for your feedback.');
      setBugReport('');
      onClose();
    } catch (error) {
      console.error('Error sending bug report:', error);
      alert('Failed to send bug report. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Report a Bug</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Describe the issue you encountered. We'll get back to you as soon as possible.
          </p>
          
          <textarea
            value={bugReport}
            onChange={(e) => setBugReport(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
            rows={6}
            placeholder="Describe the bug..."
          />
          
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={sending || !bugReport.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400"
            >
              {sending ? 'Sending...' : 'Send Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const { user, loading, logOut, verifyEmailWithToken } = useAuth();
  const [currentView, setCurrentView] = useState<View>('schedule');
  const [showBugReport, setShowBugReport] = useState(false);
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  // --- Top-level Routing Logic ---
  const hash = currentHash.substring(1); // Remove the leading '#'
  const publicShareMatch = hash.match(/^\/(\d+)\/share\/([a-zA-Z0-9-]+)/);
  const agendaShareMatch = hash.match(/^\/(\d+)\/agenda\/([a-zA-Z0-9-]+)/);
  // Matches /<club-number>/join or just /join
  const joinMatch = hash.match(/^\/(?:[^/]+\/)?join/);
  // Matches /unsubscribe
  const unsubscribeMatch = hash.match(/^\/unsubscribe/);
  // Matches /terms-of-service
  const termsMatch = hash.match(/^\/terms-of-service/);
  // Matches /privacy-policy
  const privacyMatch = hash.match(/^\/privacy-policy/);
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
    // Also clean up if hash is empty but URL has #
    if (window.location.hash === '' && window.location.href.includes('#')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Add hash change listener to make routing reactive
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
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
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-16 md:pb-0">
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
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Version: {APP_VERSION}
                </span>
                <button
                  onClick={() => setShowBugReport(true)}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                >
                  Report a Bug
                </button>
              </div>
            </footer>
            <BugReportModal 
              isOpen={showBugReport} 
              onClose={() => setShowBugReport(false)} 
              userEmail={user!.email || 'unknown@example.com'}
            />
            <MobileBottomNav currentView={currentView} setCurrentView={setCurrentView} />
          </div>
        </NotificationProvider>
      </ToastmastersProvider>
    );
  };

  // Handle unsubscribe route (no authentication required)
  if (unsubscribeMatch) {
    return <UnsubscribePage />;
  }

  // Handle Terms of Service route (no authentication required)
  if (termsMatch) {
    return <TermsOfServicePage />;
  }

  // Handle Privacy Policy route (no authentication required)
  if (privacyMatch) {
    return <PrivacyPolicyPage />;
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