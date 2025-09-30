import React, { useState, useEffect, useMemo } from 'react';
import { useToastmasters } from '../Context/ToastmastersContext';
import { useAuth } from '../Context/AuthContext';
import { AppUser, UserRole, Organization, OfficerRole, PendingInvite } from '../types';
import { abbreviateOfficerRole } from '../utils/officerRoleUtils';
import { ConfirmationModal } from './common/ConfirmationModal';
import NotificationScheduler from './NotificationScheduler';
import { EmailTestComponent } from './EmailTestComponent';
import AdminStatusIndicator from './AdminStatusIndicator';
import { db, FieldValue } from '../services/firebase';
import MentorshipPanel from './mentorship/MentorshipPanel';

const districts = [...Array(130).keys()].map(i => String(i + 1)).concat(['F', 'U']);


const EditableUser: React.FC<{
    user: AppUser,
    isCurrentUser: boolean,
    onSaveName: (payload: { uid: string, newName: string }) => Promise<any>
}> = ({ user, isCurrentUser, onSaveName }) => {
    const [name, setName] = useState(user.name);
    const [isEditing, setIsEditing] = useState(false);
    const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);
        try {
            await onSaveName({ uid: user.uid, newName: name });
            setFeedback({type: 'success', message: 'Name updated!'});
            setIsEditing(false);
        } catch (error: any) {
            setFeedback({type: 'error', message: error.message || 'Failed to update name.'});
        }
    };

    const handleCancel = () => {
        setName(user.name);
        setIsEditing(false);
        setFeedback(null);
    }
    
    useEffect(() => {
        setName(user.name);
    }, [user.name]);

    return (
        <form onSubmit={handleSave} className="space-y-4">
             {feedback && (
                <div className={`rounded-md ${feedback.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} p-3`}>
                    <p className={`text-sm font-medium ${feedback.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{feedback.message}</p>
                </div>
            )}
            <div>
                <label htmlFor={`name-${user.uid}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <div className="mt-1 flex items-center gap-2">
                    <input
                        type="text"
                        id={`name-${user.uid}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] bg-white dark:bg-gray-700 sm:text-sm"
                        required
                    />
                </div>
            </div>
             <div>
                <label htmlFor={`email-${user.uid}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                <input type="email" id={`email-${user.uid}`} value={user.email || ''} disabled
                    className="mt-1 block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm bg-gray-100 dark:bg-gray-700/50 sm:text-sm"
                />
            </div>
            <div className="flex justify-end">
                <button
                    type="submit"
                    className="inline-flex items-center justify-center bg-[#004165] hover:bg-[#003554] text-white font-bold py-2 px-4 rounded-md transition duration-150 disabled:opacity-50"
                    disabled={name.trim() === user.name}
                >
                    Save My Profile
                </button>
            </div>
        </form>
    );
};


const CopyableEmail: React.FC<{ email: string }> = ({ email }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(email);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = email;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy email:', err);
            }
            document.body.removeChild(textArea);
        }
    };

    return (
        <div className="w-full">
            <button
                onClick={handleCopy}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors cursor-pointer py-1 rounded text-left flex items-center gap-1"
            >
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="truncate">{email}</span>
                {copied && (
                    <span className="text-green-600 dark:text-green-400 text-xs ml-1">✓</span>
                )}
            </button>
        </div>
    );
};

const TeamMemberListItem: React.FC<{
    member: AppUser;
    isClubAdmin: boolean;
    isLastAdmin: boolean;
    isAdminView: boolean;
    isSelf: boolean;
    onRoleChange: (uid: string, newRole: UserRole) => void;
    onOfficerRoleChange: (uid: string, newOfficerRole: OfficerRole | null) => void;
    onRemove: (user: AppUser) => void;
    onSaveName: (payload: { uid: string, newName: string }) => Promise<any>;
    onSendPasswordReset: (member: AppUser) => void;
    isSendingPasswordReset: boolean;
    availableOfficerRoles: OfficerRole[];
}> = ({ member, isClubAdmin, isLastAdmin, isAdminView, isSelf, onRoleChange, onOfficerRoleChange, onRemove, onSaveName, onSendPasswordReset, isSendingPasswordReset, availableOfficerRoles }) => {
    
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(member.name);

    const handleSave = async () => {
        if (editedName.trim() && editedName.trim() !== member.name) {
            try {
                await onSaveName({ uid: member.uid, newName: editedName.trim() });
                setIsEditingName(false);
            } catch (error) {
                // Error will be shown by parent component's feedback state
            }
        } else {
             setIsEditingName(false);
             setEditedName(member.name);
        }
    };

    const cannotChangeRole = (isLastAdmin && member.role === UserRole.Admin) || isSelf;
    const tooltipText = isSelf
        ? "You cannot change your own role."
        : (isLastAdmin && member.role === UserRole.Admin)
        ? "Cannot change the role of the last admin."
        : "";

    return (
        <li className="py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0 mr-2">
                            {isEditingName ? (
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    onBlur={handleSave}
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                    className="w-full text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-indigo-500 rounded-md px-2 py-1"
                                    autoFocus
                                />
                            ) : (
                                <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2 break-words">
                                   {member.name}
                                   {isAdminView && (
                                     <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex-shrink-0" aria-label={`Edit name for ${member.name}`}>
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                     </button>
                                   )}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 sm:hidden">
                            {isAdminView ? (
                                <>
                                    {isClubAdmin ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 whitespace-nowrap">
                                            Club Admin
                                        </span>
                                    ) : (
                                        <select
                                            value={member.role}
                                            onChange={(e) => onRoleChange(member.uid || member.id, e.target.value as UserRole)}
                                            disabled={cannotChangeRole}
                                            title={tooltipText}
                                            className="bg-gray-50 dark:bg-gray-700 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none text-gray-900 dark:text-gray-200 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value={UserRole.Admin}>Admin</option>
                                            <option value={UserRole.Member}>Member</option>
                                        </select>
                                    )}
                                    <button
                                        onClick={() => onSendPasswordReset(member)}
                                        disabled={isSendingPasswordReset}
                                        title="Reset password"
                                        className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={`Send password reset to ${member.name}`}
                                    >
                                        {isSendingPasswordReset ? (
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => onRemove(member)}
                                        disabled={isClubAdmin}
                                        title={isClubAdmin ? "The Club Admin cannot be removed." : ""}
                                        className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={`Remove ${member.name}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </>
                            ) : (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    isClubAdmin 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                }`}>
                                    {isClubAdmin ? 'Club Admin' : member.role}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="w-full">
                        <CopyableEmail email={member.email} />
                        {/* Officer Role Badge */}
                        <div className="mt-1">
                            {member.officerRole ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                                    {abbreviateOfficerRole(member.officerRole)}
                                    {/* X button for mobile to remove officer role */}
                                    <button
                                        onClick={() => onOfficerRoleChange(member.uid || member.id, null)}
                                        className="ml-1 text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-100"
                                        title="Remove officer role"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </span>
                            ) : (
                                /* Mobile: Show + button to add officer role (admins only) */
                                <div className="sm:hidden">
                                    {member.role === UserRole.Admin && (
                                        <button
                                            onClick={() => {
                                                // For mobile, we'll show a simple prompt to select the first available role
                                                if (availableOfficerRoles.length > 0) {
                                                    onOfficerRoleChange(member.uid || member.id, availableOfficerRoles[0]);
                                                }
                                            }}
                                            disabled={availableOfficerRoles.length === 0}
                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Add officer role"
                                        >
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Add Role
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        {(member as any).joinedDate && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Joined: {new Date((member as any).joinedDate).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
                
                {/* Desktop Controls */}
                <div className="hidden sm:flex items-center gap-2">
                    {isAdminView ? (
                        <>
                            {isClubAdmin ? (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 whitespace-nowrap">
                                    Club Admin
                                </span>
                            ) : (
                                <select
                                    value={member.role}
                                    onChange={(e) => onRoleChange(member.uid || member.id, e.target.value as UserRole)}
                                    disabled={cannotChangeRole}
                                    title={tooltipText}
                                    className="bg-gray-50 dark:bg-gray-700 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none text-gray-900 dark:text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value={UserRole.Admin}>Admin</option>
                                    <option value={UserRole.Member}>Member</option>
                                </select>
                            )}
                            {/* Officer Role Dropdown - Only for Admins and only if there are available roles to assign */}
                            {!isClubAdmin && member.role === UserRole.Admin && availableOfficerRoles.length > 0 && !member.officerRole && (
                                <select
                                    value={member.officerRole || ''}
                                    onChange={(e) => onOfficerRoleChange(member.uid || member.id, e.target.value ? e.target.value as OfficerRole : null)}
                                    className="bg-gray-50 dark:bg-gray-700 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none text-gray-900 dark:text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-[160px] p-2"
                                >
                                    <option value="">No Officer Role</option>
                                    {availableOfficerRoles.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            )}
                            <button
                                onClick={() => onSendPasswordReset(member)}
                                disabled={isSendingPasswordReset}
                                title="Reset password"
                                className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label={`Send password reset to ${member.name}`}
                            >
                                {isSendingPasswordReset ? (
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                            <button
                                onClick={() => onRemove(member)}
                                disabled={isClubAdmin}
                                title={isClubAdmin ? "The Club Admin cannot be removed." : ""}
                                className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label={`Remove ${member.name}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                            </button>
                        </>
                    ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isClubAdmin 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                            {isClubAdmin ? 'Club Admin' : member.role}
                        </span>
                    )}
                </div>
            </div>
        </li>
    );
};


export const ProfilePage = (): React.ReactElement | null => {
    const { currentUser, organization, ownerId, updateClubProfile, updateUserName, updateUserRole, removeUser, sendPasswordResetEmail, pendingInvites, inviteUser, revokeInvite, removeFromPendingLinking, adminStatus } = useToastmasters();
    const { updatePassword, user, updateUserEmail } = useAuth();
    
    // State for club profile form
    const [clubName, setClubName] = useState('');
    const [district, setDistrict] = useState('');
    const [clubNumber, setClubNumber] = useState('');
    const [meetingDay, setMeetingDay] = useState<number>(2); // Default to Tuesday
    const [autoNotificationDay, setAutoNotificationDay] = useState<number>(15); // Default to 15th of month
    const [timezone, setTimezone] = useState<string>('America/New_York'); // Default to Eastern Time
    const [profileFeedback, setProfileFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

    // State for email change form
    const [newEmail, setNewEmail] = useState('');
    const [emailChangePassword, setEmailChangePassword] = useState('');
    const [emailFeedback, setEmailFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

    // State for password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordFeedback, setPasswordFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    // State for team management
    const [teamFeedback, setTeamFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [userToManage, setUserToManage] = useState<AppUser | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSendingPasswordReset, setIsSendingPasswordReset] = useState<string | null>(null);
    const [resendFeedback, setResendFeedback] = useState<{type: 'success' | 'error', message: string, inviteId?: string} | null>(null);
    const [resendingInvite, setResendingInvite] = useState<string | null>(null);
    
    
    const isPasswordUser = useMemo(() => user?.providerData.some(p => p.providerId === 'password'), [user]);
    const isAdmin = currentUser?.role === UserRole.Admin;
    const isClubAdmin = currentUser?.uid === ownerId;
    const clubOwner = organization?.members?.find(m => m?.uid === ownerId);

    const isLastAdmin = organization?.members?.filter(m => m?.role === UserRole.Admin).length === 1;

    useEffect(() => {
        if (organization) {
            setClubName(organization.name);
            setDistrict(organization.district);
            setClubNumber(organization.clubNumber);
            setMeetingDay(organization.meetingDay ?? 2); // Default to Tuesday
            setAutoNotificationDay(organization.autoNotificationDay ?? 15); // Default to 15th
            setTimezone(organization.timezone ?? 'America/New_York'); // Default to Eastern Time
        }
    }, [organization]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        if (params.get('emailChanged') === 'true') {
            setEmailFeedback({ type: 'success', message: 'Your sign-in email has been successfully updated!' });
            const newUrl = window.location.pathname + window.location.hash.split('?')[0];
            window.history.replaceState({}, '', newUrl);
        }
    }, []);

    const handleClubProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileFeedback(null);
        if (!organization) return;
        try {
            await updateClubProfile({ 
                name: clubName.trim(), 
                district: district, 
                clubNumber: clubNumber.trim(),
                meetingDay: meetingDay,
                autoNotificationDay: autoNotificationDay,
                timezone: timezone
            });
            setProfileFeedback({ type: 'success', message: 'Club profile updated successfully!' });
        } catch (error: any) {
            setProfileFeedback({ type: 'error', message: error.message || 'Failed to update club profile.' });
        }
    };

    const handleEmailUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailFeedback(null);
    
        if (!newEmail.trim()) {
            setEmailFeedback({ type: 'error', message: 'New email cannot be empty.' });
            return;
        }
        if (isPasswordUser && !emailChangePassword) {
            setEmailFeedback({ type: 'error', message: 'Current password is required to change email.' });
            return;
        }
    
        setIsUpdatingEmail(true);
        try {
            await updateUserEmail(isPasswordUser ? emailChangePassword : null, newEmail);
    
            setEmailFeedback({ type: 'success', message: `Success! Check your new inbox at ${newEmail} and click the verification link to finalize the change.` });
            setNewEmail('');
            setEmailChangePassword('');
        } catch (error: any) {
            let message = 'An unexpected error occurred. Please try again.';
            if (error.code) {
                switch(error.code) {
                    case 'auth/wrong-password':
                        message = 'The password you entered is incorrect.';
                        break;
                    case 'auth/email-already-in-use':
                        message = 'This email address is already in use by another account.';
                        break;
                    case 'auth/invalid-email':
                        message = 'The new email address is not valid.';
                        break;
                    case 'auth/requires-recent-login':
                        message = 'This is a sensitive security action. Please log out and log back in before changing your email.';
                        break;
                    case 'auth/popup-closed-by-user':
                        message = 'The re-authentication window was closed. Please try again.';
                        break;
                    default:
                        message = error.message || message;
                }
            }
            setEmailFeedback({ type: 'error', message });
        } finally {
            setIsUpdatingEmail(false);
        }
    };

     const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordFeedback(null);
        if (newPassword !== confirmPassword) {
            setPasswordFeedback({ type: 'error', message: 'New passwords do not match.' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordFeedback({ type: 'error', message: 'New password must be at least 6 characters long.' });
            return;
        }
        setIsUpdatingPassword(true);
        try {
            await updatePassword(currentPassword, newPassword);
            setPasswordFeedback({ type: 'success', message: 'Password updated successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            if (error.code === 'auth/wrong-password') {
                setPasswordFeedback({ type: 'error', message: 'The current password you entered is incorrect.' });
            } else {
                setPasswordFeedback({ type: 'error', message: 'An unexpected error occurred. Please try again.' });
                console.error(error);
            }
        } finally {
            setIsUpdatingPassword(false);
        }
    };
    
    
    const handleRoleChange = async (memberIdentifier: string, newRole: UserRole) => {
        setTeamFeedback(null);
        try {
            await updateUserRole(memberIdentifier, newRole);
            setTeamFeedback({ type: 'success', message: `Member role updated.` });
        } catch (error: any) {
            setTeamFeedback({ type: 'error', message: error.message || 'Failed to update role.' });
        }
    };

    const handleOfficerRoleChange = async (memberIdentifier: string, newOfficerRole: OfficerRole | null) => {
        setTeamFeedback(null);
        try {
            // Update the member's officer role in the organization
            if (!organization) return;
            
            const updatedMembers = organization.members.map(member => 
                member.uid === memberIdentifier || member.id === memberIdentifier
                    ? { ...member, officerRole: newOfficerRole }
                    : member
            );
            
            const updatedOrg = { ...organization, members: updatedMembers };
            
            // Update in database
            const docRef = db.collection('users').doc(ownerId);
            await docRef.update({ 'organization.members': updatedMembers });
            
            setTeamFeedback({ type: 'success', message: `Officer role updated.` });
        } catch (error: any) {
            setTeamFeedback({ type: 'error', message: error.message || 'Failed to update officer role.' });
        }
    };

    const openDeleteModal = (user: AppUser) => {
        setUserToManage(user);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToManage) return;
        setTeamFeedback(null);
        try {
            await removeUser(userToManage.uid);
            setTeamFeedback({ type: 'success', message: `User ${userToManage.email} has been removed.` });
        } catch (error: any) {
            setTeamFeedback({ type: 'error', message: error.message || 'Failed to remove user.' });
        } finally {
            setIsDeleteModalOpen(false);
            setUserToManage(null);
        }
    };

    
    const handleSaveUserName = async (payload: { uid: string, newName: string }) => {
        setTeamFeedback(null);
        try {
            await updateUserName(payload);
            setTeamFeedback({type: 'success', message: 'User name updated.'});
        } catch(error: any) {
            setTeamFeedback({type: 'error', message: error.message || 'Failed to update name.'});
        }
    };

    const handleSendPasswordReset = async (member: AppUser) => {
        setIsSendingPasswordReset(member.uid);
        setTeamFeedback(null);
        try {
            await sendPasswordResetEmail(member.email);
            setTeamFeedback({ 
                type: 'success', 
                message: `Password reset email sent to ${member.email}. They should receive it shortly.` 
            });
        } catch (error: any) {
            if (error.message.includes("No account found")) {
                setTeamFeedback({ 
                    type: 'error', 
                    message: `${member.name} hasn't created an account yet. Send them an invitation instead using the "Invite New Member" button.` 
                });
            } else if (error.message.includes("no password is set")) {
                setTeamFeedback({ 
                    type: 'error', 
                    message: `${member.name} started the signup process but never set a password. Send them a new invitation to complete their account setup.` 
                });
            } else {
                setTeamFeedback({ 
                    type: 'error', 
                    message: error.message || 'Failed to send password reset email.' 
                });
            }
        } finally {
            setIsSendingPasswordReset(null);
        }
    };

    const handleResendInvite = async (invite: PendingInvite, event?: React.MouseEvent) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        setResendingInvite(invite.id);
        setResendFeedback(null);
        
        // Simulate a brief loading state
        setTimeout(() => {
            setResendingInvite(null);
            setResendFeedback({
                type: 'success',
                message: `Invitation resent to ${invite.email}`,
                inviteId: invite.id
            });
            
            // Clear the feedback after 3 seconds
            setTimeout(() => {
                setResendFeedback(null);
            }, 3000);
        }, 1000);
    };

    const handleChangeInviteEmail = async (invite: PendingInvite, newEmail: string) => {
        try {
            // Revoke the old invitation
            await revokeInvite(invite.id);
            // Send a new invitation with the new email
            await inviteUser({ 
                email: newEmail, 
                name: invite.invitedUserName, 
                memberId: invite.memberId 
            });
        } catch (error: any) {
            console.error("Failed to change invitation email", error);
        }
    };

    const handleRemoveFromPendingLinking = async (inviteId: string) => {
        try {
            await removeFromPendingLinking(inviteId);
        } catch (error: any) {
            console.error("Failed to remove from pending linking", error);
        }
    };
    
    const hasClubProfileChanged = organization ? 
      clubName.trim() !== organization.name ||
      district !== organization.district ||
      clubNumber.trim() !== organization.clubNumber ||
      meetingDay !== (organization.meetingDay ?? 2) ||
      autoNotificationDay !== (organization.autoNotificationDay ?? 15) ||
      timezone !== (organization.timezone ?? 'America/New_York')
      : false;

    // Calculate available officer roles (roles not currently assigned)
    const availableOfficerRoles = useMemo(() => {
        if (!organization?.members) return Object.values(OfficerRole);
        
        const assignedRoles = new Set(
            organization.members
                .filter(member => member.officerRole)
                .map(member => member.officerRole)
        );
        
        return Object.values(OfficerRole).filter(role => !assignedRoles.has(role));
    }, [organization?.members]);

    if (!currentUser || !organization) {
        return null; // or a loading state
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-0">
            <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} title="Remove User">
                <p>Are you sure you want to remove <strong className="text-gray-900 dark:text-white">{userToManage?.email}</strong> from your club? They will lose all access. This action cannot be undone.</p>
            </ConfirmationModal>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">Club Profile</h2>
                {profileFeedback && (
                    <div className={`rounded-md ${profileFeedback.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} p-4 mb-4`}>
                        <p className={`text-sm font-medium ${profileFeedback.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{profileFeedback.message}</p>
                    </div>
                )}
                <form onSubmit={handleClubProfileUpdate} className="space-y-4">
                    <div>
                        <label htmlFor="clubName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Club Name</label>
                        <input type="text" id="clubName" value={clubName} onChange={(e) => setClubName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] bg-white dark:bg-gray-700 sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50"
                            required
                            disabled={!isClubAdmin}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="district" className="block text-sm font-medium text-gray-700 dark:text-gray-300">District</label>
                            <select id="district" value={district} onChange={(e) => setDistrict(e.target.value)}
                                className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 !border-2 !border-gray-300 dark:!border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-left appearance-none pr-10 disabled:bg-gray-100 dark:disabled:bg-gray-700/50"
                                required
                                disabled={!isClubAdmin}
                            >
                                {districts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="clubNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Club #</label>
                            <input type="text" id="clubNumber" value={clubNumber} onChange={(e) => setClubNumber(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] bg-white dark:bg-gray-700 sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50"
                                required
                                disabled={!isClubAdmin}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="clubAdminEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Club Admin Email</label>
                        <input type="email" id="clubAdminEmail" value={organization?.adminInfo?.email || ''} disabled
                            className="mt-1 block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm bg-gray-100 dark:bg-gray-700/50 sm:text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                            <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}
                                className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 !border-2 !border-gray-300 dark:!border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-left appearance-none pr-10 disabled:bg-gray-100 dark:disabled:bg-gray-700/50"
                                disabled={!isClubAdmin}
                            >
                                <option value="America/New_York">Eastern Time (ET)</option>
                                <option value="America/Chicago">Central Time (CT)</option>
                                <option value="America/Denver">Mountain Time (MT)</option>
                                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                <option value="America/Anchorage">Alaska Time (AKT)</option>
                                <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                                <option value="America/Phoenix">Arizona Time (MST)</option>
                                <option value="Europe/London">London (GMT/BST)</option>
                                <option value="Europe/Paris">Central European Time (CET)</option>
                                <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                                <option value="Australia/Sydney">Australian Eastern Time (AET)</option>
                            </select>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your club's timezone for accurate meeting date calculations</p>
                        </div>
                        <div>
                            <label htmlFor="meetingDay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Day</label>
                            <select id="meetingDay" value={meetingDay} onChange={(e) => setMeetingDay(parseInt(e.target.value))}
                                className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 !border-2 !border-gray-300 dark:!border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-left appearance-none pr-10 disabled:bg-gray-100 dark:disabled:bg-gray-700/50"
                                disabled={!isClubAdmin}
                            >
                                <option value={0}>Sunday</option>
                                <option value={1}>Monday</option>
                                <option value={2}>Tuesday</option>
                                <option value={3}>Wednesday</option>
                                <option value={4}>Thursday</option>
                                <option value={5}>Friday</option>
                                <option value={6}>Saturday</option>
                            </select>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Day of the week your club meets</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label htmlFor="autoNotificationDay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Auto Notification Day</label>
                            <select id="autoNotificationDay" value={autoNotificationDay} onChange={(e) => setAutoNotificationDay(parseInt(e.target.value))}
                                className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 !border-2 !border-gray-300 dark:!border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-left appearance-none pr-10 disabled:bg-gray-100 dark:disabled:bg-gray-700/50"
                                disabled={!isClubAdmin}
                            >
                                {Array.from({length: 28}, (_, i) => (
                                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                                ))}
                            </select>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Day of month to auto-send availability requests</p>
                        </div>
                    </div>
                    {isClubAdmin && (
                        <div className="flex justify-stretch sm:justify-end">
                            <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center bg-[#004165] hover:bg-[#003554] text-white font-semibold py-3 px-6 rounded-md transition duration-150 disabled:opacity-50" disabled={!hasClubProfileChanged}>
                                Save Club Profile
                            </button>
                        </div>
                    )}
                </form>
                
                {isClubAdmin && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <NotificationScheduler />
                    </div>
                )}
            </div>
            
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6">
                 <div className="flex items-center justify-between mb-4">
                     <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Profile</h2>
                     {currentUser?.role === UserRole.Admin && !currentUser?.officerRole && (
                         <AdminStatusIndicator 
                             adminStatus={adminStatus} 
                             userRole={currentUser?.role}
                             officerRole={currentUser?.officerRole}
                         />
                     )}
                 </div>
                 <EditableUser user={currentUser} isCurrentUser={true} onSaveName={handleSaveUserName} />
                 
                 {/* Mentorship Panel */}
                 {(() => {
                     const currentMember = organization?.members?.find(m => m.uid === currentUser?.uid);
                     if (currentMember) {
                         return <MentorshipPanel memberId={currentMember.id} memberName={currentMember.name} />;
                     }
                     return null;
                 })()}
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">Change Sign-in Email</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    For your security, you must re-verify your identity to change your sign-in email.
                    {isPasswordUser ? " Please provide your current password." : " A popup will ask you to sign in again."}
                </p>
                {emailFeedback && (
                    <div className={`rounded-md ${emailFeedback.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} p-4 mb-4`}>
                        <p className={`text-sm font-medium ${emailFeedback.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{emailFeedback.message}</p>
                    </div>
                )}
                <form onSubmit={handleEmailUpdate} className="space-y-4">
                    <div>
                        <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Email Address</label>
                        <input
                            type="email"
                            id="new-email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] bg-white dark:bg-gray-700 sm:text-sm"
                            required
                        />
                    </div>
                    {isPasswordUser && (
                        <div>
                            <label htmlFor="email-change-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password (for verification)</label>
                            <input
                                type="password"
                                id="email-change-password"
                                value={emailChangePassword}
                                onChange={(e) => setEmailChangePassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] bg-white dark:bg-gray-700 sm:text-sm"
                                required
                            />
                        </div>
                    )}
                    <div className="flex justify-stretch sm:justify-end">
                        <button
                            type="submit"
                            className="w-full sm:w-auto inline-flex items-center justify-center bg-[#004165] hover:bg-[#003554] text-white font-semibold py-3 px-6 rounded-md transition duration-150 disabled:opacity-50"
                            disabled={isUpdatingEmail || !newEmail || (isPasswordUser && !emailChangePassword)}
                        >
                            {isUpdatingEmail ? 'Updating...' : 'Change Email'}
                        </button>
                    </div>
                </form>
            </div>

            {isPasswordUser && <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">My Security</h2>
                {passwordFeedback && (
                    <div className={`rounded-md ${passwordFeedback.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} p-4 mb-4`}>
                        <p className={`text-sm font-medium ${passwordFeedback.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{passwordFeedback.message}</p>
                    </div>
                )}
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                     <div>
                        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                        <input type="password" id="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] bg-white dark:bg-gray-700 sm:text-sm"
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                        <input type="password" id="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] bg-white dark:bg-gray-700 sm:text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                        <input type="password" id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] bg-white dark:bg-gray-700 sm:text-sm"
                            required
                        />
                    </div>
                    <div className="flex justify-stretch sm:justify-end">
                        <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center bg-[#004165] hover:bg-[#003554] text-white font-semibold py-3 px-6 rounded-md transition duration-150 disabled:opacity-50" disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}>
                            {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>}
            
            
            {/* Pending to be Linked Section */}
            {isAdmin && pendingInvites.filter(invite => invite.memberId && invite.status === 'pending').length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6 mb-6">
                    <div className="mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Pending to be Linked</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Members who have been sent invitations but haven't linked their accounts yet.
                        </p>
                    </div>
                    <div className="space-y-3">
                        {pendingInvites
                            .filter(invite => invite.memberId && invite.status === 'pending')
                            .map(invite => {
                                // Find the corresponding member in organization.members
                                const member = organization?.members?.find(m => m.id === invite.memberId);
                                const memberName = member?.name || invite.invitedUserName;
                                
                                const formatDate = (timestamp: any) => {
                                    if (!timestamp) return 'Unknown';
                                    if (timestamp.toDate) {
                                        return timestamp.toDate().toLocaleDateString();
                                    }
                                    return new Date(timestamp).toLocaleDateString();
                                };

                                return (
                                    <div key={invite.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div className="flex-grow">
                                                <h4 className="font-medium text-gray-900 dark:text-white">{memberName}</h4>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                    {invite.email}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                                    Sent: {formatDate(invite.createdAt)}
                                                </p>
                                                {resendFeedback && resendFeedback.inviteId === invite.id && (
                                                    <div className={`mt-2 text-xs font-medium ${
                                                        resendFeedback.type === 'success' 
                                                            ? 'text-green-600 dark:text-green-400' 
                                                            : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                        {resendFeedback.message}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-row items-center gap-1 sm:gap-2">
                                                <div 
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleResendInvite(invite, e);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleResendInvite(invite, e);
                                                        }
                                                    }}
                                                    className="flex-1 sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-2 sm:px-3 py-2 bg-blue-600 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 sm:text-sm whitespace-nowrap cursor-pointer select-none"
                                                    title="Resend invitation"
                                                    style={{ 
                                                        opacity: resendingInvite === invite.id ? 0.5 : 1,
                                                        pointerEvents: resendingInvite === invite.id ? 'none' : 'auto'
                                                    }}
                                                >
                                                    {resendingInvite === invite.id ? 'Sending...' : 'Resend'}
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const newEmail = prompt('Enter new email address:', invite.email);
                                                        if (newEmail && newEmail !== invite.email) {
                                                            handleChangeInviteEmail(invite, newEmail);
                                                        }
                                                    }}
                                                    className="flex-1 sm:w-auto inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-2 sm:px-3 py-2 bg-white dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] dark:focus:ring-offset-gray-800 sm:text-sm whitespace-nowrap"
                                                    title="Change email"
                                                >
                                                    Change Email
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm(`Remove ${memberName} from pending linking? This will delete the invitation and remove the member from the club.`)) {
                                                            handleRemoveFromPendingLinking(invite.id);
                                                        }
                                                    }}
                                                    className="flex-1 sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-2 sm:px-3 py-2 bg-red-600 text-xs font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 sm:text-sm whitespace-nowrap"
                                                    title="Remove from pending"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {isAdmin && (
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6">
                    <div className="mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Team Management</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage team members and their roles. Use the "Link Account" feature to connect existing user accounts to member profiles.</p>
                    </div>
                    {teamFeedback && (
                        <div className={`rounded-md ${teamFeedback.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} p-4 mb-4`}>
                            <p className={`text-sm font-medium ${teamFeedback.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{teamFeedback.message}</p>
                        </div>
                    )}
                    
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Club Members ({organization.members?.filter(m => m.uid).length || 0})</h3>
                    <div className="flow-root">
                        <ul role="list" className="-my-5 divide-y divide-gray-200 dark:divide-gray-700">
                            {[...(organization.members || [])]
                                .filter(member => member.uid) // Only show members with Firebase Auth accounts
                                .sort((a, b) => {
                                    // Club Admin first
                                    if (a.uid === ownerId) return -1;
                                    if (b.uid === ownerId) return 1;
                                    
                                    // Then other Admins
                                    if (a.role === UserRole.Admin && b.role !== UserRole.Admin) return -1;
                                    if (b.role === UserRole.Admin && a.role !== UserRole.Admin) return 1;
                                    
                                    // Then Members alphabetically
                                    return a.name.localeCompare(b.name);
                                })
                                .map((member) => {
                                    const hasUserAccount = !!member.uid; // Has a real UID (signed-up user)
                                    
                                    return (
                                        <TeamMemberListItem
                                            key={member.uid || member.id || `member-${member.name}`}
                                            member={member}
                                            isClubAdmin={member.uid === ownerId}
                                            isLastAdmin={isLastAdmin}
                                            isAdminView={isAdmin} // Show admin controls for all members if user is admin
                                            isSelf={currentUser?.uid === member.uid}
                                            onRoleChange={handleRoleChange} // Allow role changes for all members
                                            onOfficerRoleChange={handleOfficerRoleChange} // New officer role handler
                                            onRemove={openDeleteModal} // Allow removal for all members
                                            onSaveName={handleSaveUserName} // Allow name changes for all members
                                            onSendPasswordReset={hasUserAccount ? handleSendPasswordReset : () => {}} // Only for users with accounts
                                            isSendingPasswordReset={hasUserAccount && isSendingPasswordReset === member.uid}
                                            availableOfficerRoles={availableOfficerRoles}
                                        />
                                    );
                                })}
                        </ul>
                    </div>


                </div>
            )}


            {isAdmin && (
                <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">Email Testing</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Test email functionality safely without sending to all members. Use your own email address to preview how emails will look.
                    </p>
                    <EmailTestComponent />
                </div>
            )}

        </div>
    );
};
