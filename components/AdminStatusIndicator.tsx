import React from 'react';
import { ToastmasterAdminStatus } from '../utils/adminTransitionUtils';
import { getAdminStatusDescription } from '../utils/adminTransitionUtils';
import { UserRole, OfficerRole } from '../types';
import { abbreviateOfficerRole } from '../utils/officerRoleUtils';

interface AdminStatusIndicatorProps {
  adminStatus: ToastmasterAdminStatus | null;
  userRole?: UserRole;
  officerRole?: OfficerRole;
  className?: string;
}

export const AdminStatusIndicator: React.FC<AdminStatusIndicatorProps> = ({ 
  adminStatus, 
  userRole,
  officerRole,
  className = '' 
}) => {
  if (!adminStatus) {
    return null;
  }

  const getStatusColor = (reason: string) => {
    switch (reason) {
      case 'permanent_admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'current_week_toastmaster':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'next_week_toastmaster':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'no_rights':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusIcon = (reason: string) => {
    switch (reason) {
      case 'permanent_admin':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'current_week_toastmaster':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'next_week_toastmaster':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'no_rights':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    // If user has admin rights due to Toastmaster role, show that
    if (adminStatus.reason === 'current_week_toastmaster') {
      return 'Current Week Toastmaster';
    }
    if (adminStatus.reason === 'next_week_toastmaster') {
      return 'Toastmaster';
    }
    
    // For permanent admin rights, show specific role based on officer position
    if (adminStatus.reason === 'permanent_admin') {
      if (officerRole) {
        // Show the abbreviated officer role title
        return abbreviateOfficerRole(officerRole);
      } else {
        // Admin without officer role
        return 'Admin';
      }
    }
    
    // For no rights, show Member
    if (adminStatus.reason === 'no_rights') {
      return 'Member';
    }
    
    // Fallback to the original description
    return getAdminStatusDescription(adminStatus);
  };

  const statusText = getStatusText();
  const statusColor = getStatusColor(adminStatus.reason);
  const statusIcon = getStatusIcon(adminStatus.reason);

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColor} ${className}`}>
      {statusIcon && (
        <span className="mr-2">
          {statusIcon}
        </span>
      )}
      <span>{statusText}</span>
      {adminStatus.weekInfo && (
        <span className="ml-2 text-xs opacity-75">
          ({adminStatus.weekInfo.meetingDate ? (() => {
            // Parse the date and extract just the date part to avoid timezone issues
            const dateStr = adminStatus.weekInfo.meetingDate;
            // If it's in ISO format with time, extract just the date part
            const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            const date = new Date(dateOnly + 'T00:00:00');
            
            return date.toLocaleDateString('en-US');
          })() : 'TBD'})
        </span>
      )}
    </div>
  );
};

export default AdminStatusIndicator;
