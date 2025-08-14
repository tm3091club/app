import React, { useState } from 'react';
import { emailService } from '../services/emailService';

export const EmailTestComponent: React.FC = () => {
  const [testEmail, setTestEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage('Please enter an email address');
      return;
    }

    setStatus('sending');
    setMessage('Sending test email...');

    try {
      await emailService.testEmailExtension(testEmail);
      setStatus('success');
      setMessage('Test email sent successfully! Check your inbox.');
    } catch (error) {
      setStatus('error');
      setMessage(`Error sending test email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAvailabilityRequest = async () => {
    if (!testEmail) {
      setMessage('Please enter an email address');
      return;
    }

    setStatus('sending');
    setMessage('Sending availability request...');

    try {
      await emailService.sendPersonalizedAvailabilityRequest(
        { email: testEmail, name: 'Test User' },
        'Test Club',
        'December',
        2024,
        'Monday',
        'test-club-id'
      );
      setStatus('success');
      setMessage('Availability request sent successfully! Check your inbox.');
    } catch (error) {
      setStatus('error');
      setMessage(`Error sending availability request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Email Test Component</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="testEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Test Email Address
          </label>
          <input
            id="testEmail"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Enter your email address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={handleTestEmail}
            disabled={status === 'sending'}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Send Test Email
          </button>

          <button
            onClick={handleAvailabilityRequest}
            disabled={status === 'sending'}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Send Availability Request
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-md ${
            status === 'success' ? 'bg-green-100 text-green-700' :
            status === 'error' ? 'bg-red-100 text-red-700' :
            status === 'sending' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {message}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <p><strong>Note:</strong> This component is for testing purposes only.</p>
          <p>Make sure your Firebase Email Extension is properly configured.</p>
          <p>Check the Firebase Console Extensions section for email delivery status.</p>
        </div>
      </div>
    </div>
  );
};
