
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { APP_VERSION } from '../utils/version';
import { db } from '../services/firebase';
import { EmailVerificationPage } from './EmailVerificationPage';

type AuthView = 'login' | 'signup' | 'reset';

const districts = [...Array(130).keys()].map(i => String(i + 1)).concat(['F', 'U']);

export const AuthPage: React.FC<{ isJoinFlow?: boolean; inviteToken?: string }> = ({ isJoinFlow = false, inviteToken = '' }) => {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clubName, setClubName] = useState('');
  const [district, setDistrict] = useState('1');
  const [clubNumber, setClubNumber] = useState('');
  const [meetingDay, setMeetingDay] = useState(2); // Default to Tuesday
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const { logIn, signUpAndCreateClub, sendPasswordReset, sendCustomPasswordReset, signUpInvitedUser } = useAuth();

  useEffect(() => {
    if (isJoinFlow && inviteToken) {
      // Store the inviteToken in sessionStorage immediately when component loads
      // Store invitation token in sessionStorage
      sessionStorage.setItem('inviteToken', inviteToken);
      
      setIsLoadingInvite(true);
      const inviteRef = db.collection('invitations').doc(inviteToken);
      inviteRef.get().then(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data?.status === 'pending') {
            setView('signup');
            setEmail(data.email);
            setError(null);
          } else {
            setError('This invitation has already been used or revoked.');
          }
        } else {
          setError('This invitation link is invalid or has expired.');
        }
      }).catch(() => {
        setError('Failed to validate invitation. Please check your connection and try again.');
      }).finally(() => {
        setIsLoadingInvite(false);
      });
    }
  }, [isJoinFlow, inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    // Token is already stored in sessionStorage when component loads

    try {
      if (view === 'login') {
        await logIn(email, password);
        // On success, the main App component will render the ToastmastersProvider,
        // which will check sessionStorage for the inviteToken and complete the join process.
      } else if (view === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsLoading(false);
          return;
        }
        if (isJoinFlow) {
          // Creating account for invited user
          await signUpInvitedUser(email, password);
        } else {
          await signUpAndCreateClub(email, password, { clubName, district, clubNumber, meetingDay });
          // Show verification page after successful club creation
          setShowVerification(true);
          return;
        }
      } else if (view === 'reset') {
        await sendCustomPasswordReset(email);
        setMessage('If an account with that email exists, a password reset link has been sent.');
      }
    } catch (err: any) {
      // Handle email verification flow
      if (err.message === 'VERIFICATION_SENT') {
        setShowVerification(true);
        return;
      }
      
      // Don't remove the token on failure, as the user might need to log in.
      if (err && err.code) {
        if (view === 'reset' && err.code === 'auth/user-not-found') {
            setMessage('If an account with that email exists, a password reset link has been sent.');
        } else {
            switch (err.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                setError('Invalid email or password.');
                break;
            case 'auth/email-already-in-use':
                setError(isJoinFlow ? 'This email is already registered. Please sign in.' : 'An account with this email already exists.');
                if (isJoinFlow) {
                    setView('login');
                }
                break;
            case 'auth/weak-password':
                setError('Password should be at least 6 characters.');
                break;
            default:
                setError('An unexpected error occurred. Please try again.');
                console.error(err);
            }
        }
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setMessage(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setClubName('');
    setDistrict('1');
    setClubNumber('');
    setMeetingDay(2);
  };

    const getTitle = () => {
        if (isJoinFlow) {
            return view === 'login' ? 'Sign In to Join' : 'Join Your Club';
        }
        switch (view) {
            case 'login': return 'Sign in to your account';
            case 'signup': return 'Create a new club account';
            case 'reset': return 'Reset your password';
        }
    };
    
    const getButtonText = () => {
        if (isLoading || isLoadingInvite) {
            return (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            );
        }
        if (isJoinFlow) {
            return view === 'login' ? 'Sign In & Join' : 'Create Account & Join';
        }
        switch (view) {
            case 'login': return 'Sign in';
            case 'signup': return 'Create account';
            case 'reset': return 'Send Reset Link';
        }
    }

  // Show email verification page if needed
  if (showVerification) {
    return <EmailVerificationPage email={email} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img className="mx-auto h-12 w-auto" src="https://www.toastmasters.org/content/images/globals/toastmasters-logo@2x.png" alt="Toastmasters International Logo" />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {getTitle()}
        </h2>
         <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {!isJoinFlow && view !== 'reset' ? (
                <>
                    or{' '}
                    <button onClick={() => switchView(view === 'login' ? 'signup' : 'login')} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                        {view === 'login' ? 'create a new club' : 'sign in to your account'}
                    </button>
                </>
            ) : isJoinFlow && view === 'signup' ? (
                "Complete your account to join your club."
            ) : isJoinFlow && view === 'login' ? (
                "Sign in to your existing account to accept the invitation."
            ) : null}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isJoinFlow && view === 'signup' && (
              <>
                 <div>
                  <label htmlFor="clubName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Club Name</label>
                  <div className="mt-1">
                    <input id="clubName" name="clubName" type="text" required value={clubName} onChange={(e) => setClubName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="district" className="block text-sm font-medium text-gray-700 dark:text-gray-300">District</label>
                    <select id="district" name="district" required value={district} onChange={(e) => setDistrict(e.target.value)}
                      className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 !border-2 !border-gray-300 dark:!border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-left appearance-none pr-10"
                    >
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="clubNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Club #</label>
                    <input id="clubNumber" name="clubNumber" type="text" required value={clubNumber} onChange={(e) => setClubNumber(e.target.value)}
                      className="mt-1 appearance-none block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="meetingDay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Day</label>
                  <select id="meetingDay" name="meetingDay" required value={meetingDay} onChange={(e) => setMeetingDay(parseInt(e.target.value))}
                    className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 !border-2 !border-gray-300 dark:!border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-left appearance-none pr-10 text-gray-900 dark:text-white"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Select the day of the week your club typically meets</p>
                </div>
              </>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isJoinFlow || isLoadingInvite}
                  className="appearance-none block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-200 dark:disabled:bg-gray-700/50"
                />
              </div>
            </div>

            {view !== 'reset' && (
                 <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isJoinFlow ? 'Create a Password' : 'Password'}
                    </label>
                    <div className="mt-1">
                        <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete={view === 'login' ? "current-password" : "new-password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
            )}
            
            {view === 'signup' && (
                <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isJoinFlow ? 'Confirm that Password' : 'Confirm Password'}
                    </label>
                    <div className="mt-1">
                        <input
                            id="confirm-password"
                            name="confirm-password"
                            type="password"
                            autoComplete="new-password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
            )}

            {!isJoinFlow && view === 'login' && (
                <div className="flex items-center justify-end">
                    <div className="text-sm">
                        <button type="button" onClick={() => switchView('reset')} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                            Forgot your password?
                        </button>
                    </div>
                </div>
            )}
            
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                     <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                    {/* Show Sign In button for all invitation-related errors */}
                    {isJoinFlow && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          If you already have an account, you can sign in below:
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setView('login');
                            setError(null);
                            setEmail('');
                            setPassword('');
                          }}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                          Sign In to Your Account
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {message && (
              <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
                <div className="flex">
                   <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">{message}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || isLoadingInvite || (isJoinFlow && !email)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#004165] hover:bg-[#003554] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition-all"
              >
                {getButtonText()}
              </button>
            </div>
          </form>

           {view === 'reset' && (
                <div className="mt-6">
                    <p className="text-center text-sm">
                        <button onClick={() => switchView('login')} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                           Back to Sign In
                        </button>
                    </p>
                </div>
            )}
        </div>
      </div>
      
      {/* Terms of Service and Privacy Policy Links */}
      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <div className="flex justify-center space-x-4">
          <button 
            onClick={() => window.location.hash = '#/terms-of-service'}
            className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 underline bg-transparent border-none cursor-pointer"
          >
            Terms of Service
          </button>
          <button 
            onClick={() => window.location.hash = '#/privacy-policy'}
            className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 underline bg-transparent border-none cursor-pointer"
          >
            Privacy Policy
          </button>
        </div>
      </div>
      
      <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        Version: {APP_VERSION}
      </div>
    </div>
  );
};
