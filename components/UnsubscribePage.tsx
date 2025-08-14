import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export const UnsubscribePage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState<string>('');
  
  // Parse URL parameters from hash-based routing
  const hash = window.location.hash.substring(1);
  const urlParams = new URLSearchParams(hash.split('?')[1] || '');
  const emailParam = urlParams.get('email');
  const clubId = urlParams.get('club') || 'default';

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
      // Auto-submit if email is provided in URL
      handleUnsubscribe(emailParam);
    }
  }, [emailParam]);

  const handleUnsubscribe = async (emailToUnsubscribe?: string) => {
    const emailToUse = emailToUnsubscribe || email;
    
    if (!emailToUse) {
      setStatus('error');
      return;
    }

    try {
      // Record the unsubscribe request
      await addDoc(collection(db, 'unsubscribes'), {
        email: emailToUse,
        clubId: clubId,
        timestamp: Timestamp.now(),
        userAgent: navigator.userAgent,
        ipAddress: 'client-side' // Will be captured server-side if needed
      });

      setStatus('success');
    } catch (error) {
      console.error('Error recording unsubscribe:', error);
      setStatus('error');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUnsubscribe();
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Unsubscribe from Emails</h1>
            <p className="text-gray-600 mb-6">
              Please enter your email address to unsubscribe from our club notifications.
            </p>
            
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Enter your email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              
              <button
                type="submit"
                disabled={!email}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Unsubscribe
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-green-600 mb-4">Successfully Unsubscribed</h1>
            <p className="text-gray-700 mb-4">
              You have been successfully unsubscribed from our email notifications.
            </p>
            <p className="text-sm text-gray-500">
              If you change your mind, you can contact your club officers to be added back to the list.
            </p>
            
            <div className="mt-6">
              <a
                href="#/"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Return to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-4">
            There was an error processing your unsubscribe request. Please try again or contact your club officers.
          </p>
          
          <button
            onClick={() => setStatus('loading')}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};
