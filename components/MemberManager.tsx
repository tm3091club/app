import React, { useState, useMemo, useEffect } from 'react';
import { useToastmasters } from '../Context/ToastmastersContext';
import { MemberStatus, Member, AvailabilityStatus, AppUser, UserRole, Organization, MonthlySchedule, PendingInvite } from '../types';
import { getMeetingDatesForMonth } from '../services/scheduleLogic';
import { WithTooltip } from './common/WithTooltip';
import { getCurrentMonthInfo, getNextMonthInfo, getRelevantMonthsForAvailability, getNextScheduleMonth } from '../utils/monthUtils';

const LinkAccountModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onLink: (email: string) => Promise<void>;
    memberName: string;
}> = ({ isOpen, onClose, onLink, memberName }) => {
    const [email, setEmail] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setEmail('');
            setError(null);
            setIsLinking(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter an email address');
            return;
        }
        
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
            setError('Please enter a valid email address');
            return;
        }

        setIsLinking(true);
        setError(null);
        
        try {
            await onLink(email.trim());
            onClose();
        } catch (error: any) {
            setError(error.message || 'Failed to send invitation. Please try again.');
        } finally {
            setIsLinking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                            Send Invitation for "{memberName}"
                        </h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Enter the email address to send an invitation. They will receive an email with a link to create an account and join this member profile.
                        </p>
                        <div className="mt-4">
                            <label htmlFor="link-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="link-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border !border-2 !border-gray-300 dark:!border-gray-600 appearance-none rounded-md shadow-sm focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] bg-white dark:bg-gray-700 sm:text-sm"
                                placeholder="user@example.com"
                                required
                                autoFocus
                            />
                            {error && (
                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                        <button
                            type="submit"
                            disabled={isLinking || !email.trim()}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {isLinking ? 'Sending...' : 'Send Invitation'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLinking}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] dark:focus:ring-offset-gray-800 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all">
                <div className="p-6">
                    <div className="flex items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
                            <svg className="h-6 w-6 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                {title}
                            </h3>
                            <div className="mt-2">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                        {title.includes('Delete') ? 'Delete' : 'Confirm'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] dark:focus:ring-offset-gray-800 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};


const InlineCheckbox: React.FC<{ id: string; name: string; label: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled?: boolean; }> = ({ id, name, label, checked, onChange, disabled = false }) => (
    <div className="flex items-center">
        <input
            id={id}
            name={name}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] border-gray-300 rounded disabled:opacity-50"
        />
        <label htmlFor={id} className={`ml-2 text-sm text-gray-900 dark:text-gray-300 font-medium ${disabled ? 'opacity-50' : ''}`}>{label}</label>
    </div>
);

const availabilityDisplayMap: Record<AvailabilityStatus, string> = {
    [AvailabilityStatus.Available]: 'Available',
    [AvailabilityStatus.Unavailable]: 'Unavailable',
    [AvailabilityStatus.Possible]: 'Possible',
};

const getStatusBadgeColor = (status: MemberStatus) => {
    switch (status) {
        case MemberStatus.Active: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case MemberStatus.Possible: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case MemberStatus.Unavailable: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        case MemberStatus.Archived: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const SortIcon: React.FC<{ direction: 'ascending' | 'descending' }> = ({ direction }) => (
    <div className="flex flex-col -space-y-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${direction === 'ascending' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${direction === 'descending' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
        </svg>
    </div>
);

const MemberRow: React.FC<{ 
    member: Member; 
    meetingDates: Date[]; 
    monthName: string;
    isEditing: boolean;
    editedName: string;
    onNameChange: (value: string) => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: () => Promise<void>;
    editError: string | null;
    isSelf?: boolean;
    linkedUser?: AppUser | null;
    onLink: () => void;
    onUnlink: () => void;
    onResendInvite: (invite: PendingInvite) => void;
    onChangeInviteEmail: (invite: PendingInvite, newEmail: string) => void;
    getPendingInviteForMember: (memberId: string) => PendingInvite | null;
}> = ({ member, meetingDates, monthName, isEditing, editedName, onNameChange, onStartEdit, onCancelEdit, onSaveEdit, editError, isSelf = false, linkedUser, onLink, onUnlink, onResendInvite, onChangeInviteEmail, getPendingInviteForMember }) => {
    const { availability, updateMemberStatus, updateMemberJoinDate, updateMemberQualifications, setMemberAvailability, currentUser } = useToastmasters();
    const isAdmin = currentUser?.role === UserRole.Admin;
    const canEditRow = isAdmin;
    const canEditAvailability = isAdmin || isSelf;
    
    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateMemberStatus({ 
            id: member.id, 
            status: e.target.value as MemberStatus,
        });
    };

    const handleQualificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        updateMemberQualifications({
            id: member.id,
            qualifications: { [name]: checked }
        });
    };
    
    const handleAvailabilityChange = (date: string, status: AvailabilityStatus) => {
        setMemberAvailability({ memberId: member.id, date, status });
    };

    const isWeeklyAvailabilityDisabled = member.status !== MemberStatus.Active;

    const getWeeklyStatus = (dateKey: string): AvailabilityStatus => {
        if (member.status === MemberStatus.Unavailable || member.status === MemberStatus.Archived) {
            return AvailabilityStatus.Unavailable;
        }
        if (member.status === MemberStatus.Possible) {
            return AvailabilityStatus.Possible;
        }
        // Only if member is Active, we check for specific overrides.
        return availability[member.id]?.[dateKey] || AvailabilityStatus.Available;
    };

    const displayName = linkedUser ? linkedUser.name : member.name;

    return (
        <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                {isEditing && canEditRow && !linkedUser ? (
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={editedName}
                                onChange={(e) => onNameChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSaveEdit();
                                    if (e.key === 'Escape') onCancelEdit();
                                }}
                                className="w-full px-2 py-1 border border-indigo-300 dark:border-indigo-600 rounded-md shadow-sm focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] dark:bg-gray-700 dark:text-white"
                                autoFocus
                            />
                            <button onClick={onSaveEdit} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-gray-700 rounded-full" aria-label="Save name">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button onClick={onCancelEdit} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-gray-700 rounded-full" aria-label="Cancel edit">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        {editError && <p className="text-red-500 text-xs mt-1">{editError}</p>}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 w-full">
                        {linkedUser && isAdmin && (
                            <WithTooltip show={true} text="Unlink Account">
                                <button onClick={onUnlink} className="flex-shrink-0 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-gray-700" aria-label={`Unlink account for ${linkedUser.name}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </WithTooltip>
                        )}
                        <div className="flex-grow">
                            <div className="flex items-center gap-2 group">
                                <span className="font-medium">{displayName}</span>
                                {canEditRow && !linkedUser && (
                                    <button onClick={onStartEdit} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:opacity-100 focus:outline-none p-1 rounded-full" aria-label={`Edit name for ${displayName}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            {linkedUser ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{linkedUser.email}</p>
                            ) : (() => {
                                const pendingInvite = getPendingInviteForMember(member.id);
                                if (pendingInvite) {
                                    return (
                                        <div className="mt-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                                                    Invitation sent to {pendingInvite.email}
                                                </span>
                                                {isAdmin && (
                                                    <div className="flex gap-1">
                                                        <button 
                                                            onClick={() => onResendInvite(pendingInvite)}
                                                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                            title="Resend invitation"
                                                        >
                                                            Resend
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                const newEmail = prompt('Enter new email address:', pendingInvite.email);
                                                                if (newEmail && newEmail !== pendingInvite.email) {
                                                                    onChangeInviteEmail(pendingInvite, newEmail);
                                                                }
                                                            }}
                                                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                            title="Change email"
                                                        >
                                                            Change
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                } else if (isAdmin) {
                                    return (
                                        <button onClick={onLink} className="mt-1 text-xs text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                                            Link Account...
                                        </button>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                )}
            </td>
            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                {canEditRow ? (
                    <input
                        type="date"
                        value={member.joinedDate ? member.joinedDate.split('T')[0] : ''}
                        onChange={(e) => {
                            if (e.target.value) {
                                updateMemberJoinDate({ 
                                    memberId: member.id, 
                                    joinedDate: new Date(e.target.value).toISOString()
                                });
                            }
                        }}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                ) : (
                    member.joinedDate ? new Date(member.joinedDate).toLocaleDateString() : 'Unknown'
                )}
            </td>
             <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="inline-grid grid-cols-2 gap-x-4 gap-y-2">
                    <InlineCheckbox id={`tm-${member.id}`} name="isToastmaster" label="TM" checked={!!member.isToastmaster} onChange={handleQualificationChange} disabled={!canEditRow} />
                    <InlineCheckbox id={`ttm-${member.id}`} name="isTableTopicsMaster" label="TTM" checked={!!member.isTableTopicsMaster} onChange={handleQualificationChange} disabled={!canEditRow} />
                    <InlineCheckbox id={`pp-${member.id}`} name="isPastPresident" label="PP" checked={!!member.isPastPresident} onChange={handleQualificationChange} disabled={!canEditRow} />
                    <InlineCheckbox id={`ge-${member.id}`} name="isGeneralEvaluator" label="GE" checked={!!member.isGeneralEvaluator} onChange={handleQualificationChange} disabled={!canEditRow} />
                </div>
            </td>
            <td className="px-6 py-4 text-sm">
                <select 
                    value={member.status} 
                    onChange={handleStatusChange}
                    aria-label={`Status for ${displayName}`}
                    disabled={!canEditRow}
                    className={`border-transparent rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] py-1 px-2 disabled:opacity-50 ${getStatusBadgeColor(member.status)}`}
                    style={{
                        // Safari-specific fixes for text centering
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        appearance: 'none',
                        textAlign: 'center',
                        // Force centering for Safari
                        textAlignLast: 'center',
                        // Additional Safari-specific properties
                        WebkitTextAlign: 'center'
                    }}
                >
                    {Object.values(MemberStatus).map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </td>
            <td className="px-6 py-4 whitespace-normal text-sm">
                 <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {meetingDates.length > 0 ? (
                        meetingDates.map(date => {
                            const dateKey = date.toISOString().split('T')[0];
                            const currentStatus = getWeeklyStatus(dateKey);
                            return (
                                 <div key={dateKey} className="flex items-center gap-1.5">
                                    <label className="text-xs text-gray-900 dark:text-gray-100 font-bold whitespace-nowrap">
                                        {date.toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' })}
                                    </label>
                                    <select
                                        value={currentStatus}
                                        onChange={e => handleAvailabilityChange(dateKey, e.target.value as AvailabilityStatus)}
                                        disabled={isWeeklyAvailabilityDisabled || !canEditAvailability}
                                        className="w-auto bg-white dark:bg-gray-700 border-2 !border-2 !border-gray-300 dark:!border-gray-600 appearance-none appearance-none rounded-md shadow-sm py-1 pr-7 focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-xs text-gray-900 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                        style={{
                                            // Safari-specific fixes for text centering
                                            WebkitAppearance: 'none',
                                            MozAppearance: 'none',
                                            appearance: 'none',
                                            textAlign: 'center',
                                            // Force centering for Safari
                                            textAlignLast: 'center',
                                            // Additional Safari-specific properties
                                            WebkitTextAlign: 'center'
                                        }}
                                    >
                                        {Object.values(AvailabilityStatus).map(s => <option key={s} value={s}>{availabilityDisplayMap[s]}</option>)}
                                    </select>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Select a valid start date above to see meeting dates.
                        </p>
                    )}
                 </div>
            </td>
        </tr>
    );
};

const MobileMemberCard: React.FC<{ 
    member: Member; 
    meetingDates: Date[]; 
    monthName: string; 
    isEditing: boolean;
    editedName: string;
    onNameChange: (value: string) => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: () => Promise<void>;
    editError: string | null;
    isSelf?: boolean;
    linkedUser?: AppUser | null;
    onLink: () => void;
    onUnlink: () => void;
    onResendInvite: (invite: PendingInvite) => void;
    onChangeInviteEmail: (invite: PendingInvite, newEmail: string) => void;
    getPendingInviteForMember: (memberId: string) => PendingInvite | null;
}> = ({ member, meetingDates, monthName, isEditing, editedName, onNameChange, onStartEdit, onCancelEdit, onSaveEdit, editError, isSelf = false, linkedUser, onLink, onUnlink, onResendInvite, onChangeInviteEmail, getPendingInviteForMember }) => {
    const { availability, updateMemberStatus, updateMemberJoinDate, updateMemberQualifications, setMemberAvailability, currentUser } = useToastmasters();
    const isAdmin = currentUser?.role === UserRole.Admin;
    const canEditRow = isAdmin;
    const canEditAvailability = isAdmin || isSelf;

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateMemberStatus({ id: member.id, status: e.target.value as MemberStatus });
    };
    const handleQualificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        updateMemberQualifications({ id: member.id, qualifications: { [name]: checked } });
    };
    const handleAvailabilityChange = (date: string, status: AvailabilityStatus) => {
        setMemberAvailability({ memberId: member.id, date, status });
    };
    const isWeeklyAvailabilityDisabled = member.status !== MemberStatus.Active;

    const getWeeklyStatus = (dateKey: string): AvailabilityStatus => {
        if (member.status === MemberStatus.Unavailable || member.status === MemberStatus.Archived) {
            return AvailabilityStatus.Unavailable;
        }
        if (member.status === MemberStatus.Possible) {
            return AvailabilityStatus.Possible;
        }
        return availability[member.id]?.[dateKey] || AvailabilityStatus.Available;
    };
    
    const displayName = linkedUser ? linkedUser.name : member.name;

    return (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {/* Column 1: Member Info */}
                <div className="space-y-4">
                    <div>
                        {isEditing && canEditRow && !linkedUser ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => onNameChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onSaveEdit();
                                        if (e.key === 'Escape') onCancelEdit();
                                    }}
                                    className="w-full text-lg font-bold px-2 py-1 border border-indigo-300 dark:border-indigo-600 rounded-md shadow-sm focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] dark:bg-gray-700 dark:text-white"
                                    autoFocus
                                />
                                <div className="flex items-center gap-2">
                                    <button onClick={onSaveEdit} className="flex-1 inline-flex justify-center items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Save</button>
                                    <button onClick={onCancelEdit} className="flex-1 inline-flex justify-center items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                                </div>
                                {editError && <p className="text-red-500 text-xs mt-1">{editError}</p>}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{displayName}</p>
                                {canEditRow && !linkedUser && (
                                <button onClick={onStartEdit} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none p-1 rounded-full" aria-label={`Edit name for ${displayName}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                )}
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Qualifications</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                            <InlineCheckbox id={`m-tm-${member.id}`} name="isToastmaster" label="TM" checked={!!member.isToastmaster} onChange={handleQualificationChange} disabled={!canEditRow} />
                            <InlineCheckbox id={`m-ttm-${member.id}`} name="isTableTopicsMaster" label="TTM" checked={!!member.isTableTopicsMaster} onChange={handleQualificationChange} disabled={!canEditRow} />
                            <InlineCheckbox id={`m-pp-${member.id}`} name="isPastPresident" label="PP" checked={!!member.isPastPresident} onChange={handleQualificationChange} disabled={!canEditRow} />
                            <InlineCheckbox id={`m-ge-${member.id}`} name="isGeneralEvaluator" label="GE" checked={!!member.isGeneralEvaluator} onChange={handleQualificationChange} disabled={!canEditRow} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                        <select 
                            value={member.status} 
                            onChange={handleStatusChange}
                            aria-label={`Status for ${displayName}`}
                            disabled={!canEditRow}
                            className={`w-auto border-transparent rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] py-1 px-2 text-center disabled:opacity-50 ${getStatusBadgeColor(member.status)}`}
                        >
                            {Object.values(MemberStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Column 2: Availability */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Availability ({monthName})</h4>
                    {meetingDates.length > 0 ? (
                        meetingDates.map(date => {
                            const dateKey = date.toISOString().split('T')[0];
                            const currentStatus = getWeeklyStatus(dateKey);
                            return (
                                <div key={dateKey} className="flex items-center justify-between gap-1.5">
                                    <label className="text-xs text-gray-900 dark:text-gray-100 font-bold whitespace-nowrap">
                                        {date.toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' })}
                                    </label>
                                    <select
                                        value={currentStatus}
                                        onChange={e => handleAvailabilityChange(dateKey, e.target.value as AvailabilityStatus)}
                                        disabled={isWeeklyAvailabilityDisabled || !canEditAvailability}
                                        className="w-auto bg-white dark:bg-gray-700 border-2 !border-2 !border-gray-300 dark:!border-gray-600 appearance-none appearance-none rounded-md shadow-sm py-1 pr-7 focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-xs text-center text-gray-900 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                    >
                                        {Object.values(AvailabilityStatus).map(s => <option key={s} value={s}>{availabilityDisplayMap[s]}</option>)}
                                    </select>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                            Select start date above.
                        </p>
                    )}
                </div>
            </div>
            {isAdmin && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    {linkedUser ? (
                        <>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Linked Account</label>
                            <div className="flex items-center gap-2">
                                <div className="flex-grow">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{linkedUser.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{linkedUser.email}</p>
                                    <div className="mt-1">
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Joined Date</label>
                                        {canEditRow ? (
                                            <input
                                                type="date"
                                                value={member.joinedDate ? member.joinedDate.split('T')[0] : ''}
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        updateMemberJoinDate({ 
                                                            memberId: member.id, 
                                                            joinedDate: new Date(e.target.value).toISOString()
                                                        });
                                                    }
                                                }}
                                                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                            />
                                        ) : (
                                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                                {member.joinedDate ? new Date(member.joinedDate).toLocaleDateString() : 'Unknown'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <WithTooltip show={true} text="Unlink Account">
                                    <button onClick={onUnlink} className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-gray-700" aria-label={`Unlink account for ${linkedUser.name}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </WithTooltip>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">No Linked Account</p>
                            <div className="mb-3">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Joined Date</label>
                                {canEditRow ? (
                                    <input
                                        type="date"
                                        value={member.joinedDate ? member.joinedDate.split('T')[0] : ''}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                updateMemberJoinDate({ 
                                                    memberId: member.id, 
                                                    joinedDate: new Date(e.target.value).toISOString()
                                                });
                                            }
                                        }}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                    />
                                ) : (
                                    <p className="text-xs text-gray-600 dark:text-gray-300">
                                        {member.joinedDate ? new Date(member.joinedDate).toLocaleDateString() : 'Unknown'}
                                    </p>
                                )}
                            </div>
                            {(() => {
                                const pendingInvite = getPendingInviteForMember(member.id);
                                if (pendingInvite) {
                                    return (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                                                    Invitation sent to {pendingInvite.email}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => onResendInvite(pendingInvite)}
                                                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    Resend
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const newEmail = prompt('Enter new email address:', pendingInvite.email);
                                                        if (newEmail && newEmail !== pendingInvite.email) {
                                                            onChangeInviteEmail(pendingInvite, newEmail);
                                                        }
                                                    }}
                                                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    Change Email
                                                </button>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <button onClick={onLink} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                                            Link Account...
                                        </button>
                                    );
                                }
                            })()}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const ArchivedMemberRow: React.FC<{ member: Member; onDelete: (member: Member) => void; }> = ({ member, onDelete }) => {
    const { updateMemberStatus } = useToastmasters();

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateMemberStatus({
            id: member.id,
            status: e.target.value as MemberStatus,
        });
    };

    return (
        <tr className="bg-white dark:bg-gray-800">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-300">{member.name}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                <select
                    value={member.status}
                    onChange={handleStatusChange}
                    aria-label={`Status for archived member ${member.name}`}
                    className={`border-transparent rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] py-1 px-2 text-center ${getStatusBadgeColor(member.status)}`}
                >
                    {Object.values(MemberStatus).map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                <button
                    onClick={() => onDelete(member)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label={`Delete ${member.name}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                </button>
            </td>
        </tr>
    );
};

const ArchivedMobileMemberCard: React.FC<{ member: Member; onDelete: (member: Member) => void; }> = ({ member, onDelete }) => {
    const { updateMemberStatus } = useToastmasters();
    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateMemberStatus({ id: member.id, status: e.target.value as MemberStatus });
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex items-center justify-between">
            <div className="flex-grow">
                <p className="font-medium text-gray-500 dark:text-gray-300">{member.name}</p>
                <select
                    value={member.status}
                    onChange={handleStatusChange}
                    aria-label={`Status for archived member ${member.name}`}
                    className={`mt-2 w-full sm:w-auto border-transparent rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] py-1 px-2 text-center ${getStatusBadgeColor(member.status)}`}
                >
                    {Object.values(MemberStatus).map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>
            <div className="flex-shrink-0 ml-4">
                <button
                    onClick={() => onDelete(member)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label={`Delete ${member.name}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

const AddMemberCheckbox: React.FC<{ id: string; label: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ id, label, checked, onChange }) => (
    <div className="flex items-start">
        <div className="flex items-center h-5">
            <input
                id={id}
                name={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
        </div>
        <div className="ml-3 text-sm">
            <label htmlFor={id} className="font-medium text-gray-700 dark:text-gray-300">{label}</label>
        </div>
    </div>
);

const MembersTable: React.FC<{
    memberList: Member[];
    isMyProfileSection?: boolean;
    isAdmin: boolean;
    // all the props MemberRow needs
    meetingDates: Date[];
    monthName: string;
    editingMemberId: string | null;
    editedName: string;
    editError: string | null;
    organization: Organization | null;
    onNameChange: (value: string) => void;
    onStartEdit: (member: Member) => void;
    onCancelEdit: () => void;
    onSaveEdit: () => Promise<void>;
    onLink: (member: Member) => void;
    onUnlink: (memberId: string) => void;
    onResendInvite: (invite: PendingInvite) => void;
    onChangeInviteEmail: (invite: PendingInvite, newEmail: string) => void;
    getPendingInviteForMember: (memberId: string) => PendingInvite | null;
    handleSortRequest?: () => void;
    sortConfig?: { direction: 'ascending' | 'descending' };
}> = ({ 
    memberList, isMyProfileSection = false, isAdmin, meetingDates, monthName,
    editingMemberId, editedName, editError, organization, onNameChange, onStartEdit, onCancelEdit, onSaveEdit,
    onLink, onUnlink, onResendInvite, onChangeInviteEmail, getPendingInviteForMember, handleSortRequest, sortConfig
}) => {
    return (
        <>
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                {isAdmin ? (
                                    <button onClick={handleSortRequest} className="flex items-center gap-2 group focus:outline-none">
                                        <span>Name</span>
                                        {sortConfig && <SortIcon direction={sortConfig.direction} />}
                                    </button>
                                ) : (
                                    <span>Name</span>
                                )}
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Joined</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Qualifications</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Availability ({monthName})</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {memberList.length > 0 ? memberList.map((member, index) => (
                            <MemberRow 
                                key={member.id || `member-${index}`}
                                member={member} 
                                meetingDates={meetingDates}
                                monthName={monthName}
                                isEditing={editingMemberId === member.id}
                                editedName={editedName}
                                onNameChange={onNameChange}
                                onStartEdit={() => onStartEdit(member)}
                                onCancelEdit={onCancelEdit}
                                onSaveEdit={onSaveEdit}
                                editError={editingMemberId === member.id ? editError : null}
                                isSelf={!isAdmin && isMyProfileSection}
                                linkedUser={member?.uid ? { uid: member.uid, email: member.email || '', name: member.name, role: UserRole.Member } : null}
                                onLink={() => onLink(member)}
                                onUnlink={() => onUnlink(member.id)}
                                onResendInvite={onResendInvite}
                                onChangeInviteEmail={onChangeInviteEmail}
                                getPendingInviteForMember={getPendingInviteForMember}
                            />
                        )) : (
                            <tr>
                                <td colSpan={isAdmin ? 4 : 3} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                    No members in this list.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-3 bg-gray-50 dark:bg-gray-900">
                 {memberList.length > 0 ? memberList.map((member, index) => (
                    <MobileMemberCard
                        key={member.id || `mobile-member-${index}`}
                        member={member}
                        meetingDates={meetingDates}
                        monthName={monthName}
                        isEditing={editingMemberId === member.id}
                        editedName={editedName}
                        onNameChange={onNameChange}
                        onStartEdit={() => onStartEdit(member)}
                        onCancelEdit={onCancelEdit}
                        onSaveEdit={onSaveEdit}
                        editError={editingMemberId === member.id ? editError : null}
                        isSelf={!isAdmin && isMyProfileSection}
                        linkedUser={member?.uid ? { uid: member.uid, email: member.email || '', name: member.name, role: UserRole.Member } : null}
                        onLink={() => onLink(member)}
                        onUnlink={() => onUnlink(member.id)}
                        onResendInvite={onResendInvite}
                        onChangeInviteEmail={onChangeInviteEmail}
                        getPendingInviteForMember={getPendingInviteForMember}
                    />
                 )) : (
                    <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                        No members in this list.
                    </div>
                 )}
            </div>
        </>
    );
};


export const MemberManager: React.FC = () => {
    const { schedules, addMember, deleteMember, updateMemberName, currentUser, organization, ownerId, linkMemberToAccount, linkCurrentUserToMember, inviteUser, pendingInvites, revokeInvite } = useToastmasters();
    const [fullName, setFullName] = useState('');
    const [status, setStatus] = useState<MemberStatus>(MemberStatus.Active);
    const [qualifications, setQualifications] = useState({
        isToastmaster: false,
        isTableTopicsMaster: false,
        isGeneralEvaluator: false,
        isPastPresident: false,
    });
    const [addMemberError, setAddMemberError] = useState<string | null>(null);
    const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: 'name'; direction: 'ascending' | 'descending' }>({
        key: 'name',
        direction: 'ascending',
    });
    
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [editedName, setEditedName] = useState('');
    const [editError, setEditError] = useState<string | null>(null);

    // State for linking modal
    const [memberToLink, setMemberToLink] = useState<Member | null>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);
    
    // NEW: State for availability month selection
    const [availabilityMonth, setAvailabilityMonth] = useState<{ year: number; month: number } | null>(null);
    
    const isAdmin = currentUser?.role === UserRole.Admin;



    // NEW: Auto-set availability month to current month for better UX
    // This is completely independent of schedule planning
    useEffect(() => {
        if (organization?.meetingDay !== undefined && !availabilityMonth) {
            const relevantMonths = getRelevantMonthsForAvailability(organization.meetingDay);
            setAvailabilityMonth({ year: relevantMonths.current.year, month: relevantMonths.current.month });
        }
    }, [organization?.meetingDay, availabilityMonth]);

    // Get availability month info
    const availabilityMonthInfo = useMemo(() => {
        if (!availabilityMonth) {
            const d = new Date();
            return { year: d.getFullYear(), month: d.getMonth() };
        }
        return availabilityMonth;
    }, [availabilityMonth]);



    // NEW: Get meeting dates for availability month - COMPLETELY INDEPENDENT
    const availabilityMeetingDates = useMemo(() => {
        if (!availabilityMonth) return [];
        const meetingDay = organization?.meetingDay ?? 2;
        const dates: Date[] = [];
        const firstDay = new Date(availabilityMonthInfo.year, availabilityMonthInfo.month, 1);
        const lastDay = new Date(availabilityMonthInfo.year, availabilityMonthInfo.month + 1, 0);
        
        // Find the first meeting day of the month
        let currentDate = new Date(firstDay);
        while (currentDate.getDay() !== meetingDay) {
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Add all meeting days for the month
        while (currentDate <= lastDay) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 7); // Next week
        }
        
        return dates;
    }, [availabilityMonth, availabilityMonthInfo, organization?.meetingDay]);



    // NEW: Handle availability month change
    const handleAvailabilityMonthChange = (part: 'year' | 'month', value: number) => {
        if (!availabilityMonth) return;
        
        let newYear = availabilityMonth.year, newMonth = availabilityMonth.month;
        if (part === 'year') newYear = value;
        if (part === 'month') newMonth = value;

        setAvailabilityMonth({ year: newYear, month: newMonth });
    };

    // NEW: Quick month selector for availability - COMPLETELY INDEPENDENT
    const handleQuickMonthSelect = (targetMonth: 'current' | 'planning') => {
        if (!organization?.meetingDay) return;
        
        const relevantMonths = getRelevantMonthsForAvailability(organization.meetingDay);
        let target: { year: number; month: number };
        
        switch (targetMonth) {
            case 'current':
                target = relevantMonths.current;
                break;
            case 'planning':
                // Use the next month for planning
                target = relevantMonths.next;
                break;
        }
        
        setAvailabilityMonth(target);
    };

    const activeMembers = useMemo(() => {
        // Use organization.members but filter out the club admin and archived members
        const allMembers = organization?.members || [];
        return allMembers.filter(m => 
            m.status !== MemberStatus.Archived && 
            m.uid !== ownerId // Exclude club admin
        );
    }, [organization?.members, ownerId]);

    const sortedMembersForAdmin = useMemo(() => {
        if (!isAdmin) return [];
        return [...activeMembers].sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (nameA < nameB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (nameA > nameB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [activeMembers, sortConfig, isAdmin]);
    
    const myProfile = useMemo(() => {
        if (!currentUser?.uid) return null;
        return activeMembers.find(m => m.uid === currentUser.uid);
    }, [activeMembers, currentUser]);

    const otherClubMembers = useMemo(() => {
        if (isAdmin || !currentUser?.uid) return [];
        const others = activeMembers.filter(m => m.uid !== currentUser.uid);
        return others.sort((a, b) => a.name.localeCompare(b.name));
    }, [activeMembers, currentUser, isAdmin]);

    const archivedMembers = useMemo(() => {
        // Use organization.members but filter out the club admin and only show archived
        const allMembers = organization?.members || [];
        return allMembers
            .filter(m => m.status === MemberStatus.Archived && m.uid !== ownerId)
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [organization?.members, ownerId]);

    const handleQualificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setQualifications(prev => ({ ...prev, [name]: checked }));
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddMemberError(null);
        const name = fullName.trim();
        if (name) {
            try {
                await addMember({ name, status, ...qualifications });
                setFullName('');
                setStatus(MemberStatus.Active);
                setQualifications({ isToastmaster: false, isTableTopicsMaster: false, isGeneralEvaluator: false, isPastPresident: false });
            } catch (error: any) {
                setAddMemberError(error.message);
            }
        }
    };
    
    const handleOpenDeleteModal = (member: Member) => {
        setMemberToDelete(member);
    };

    const handleConfirmDelete = async () => {
        if (memberToDelete) {
            await deleteMember({ memberId: memberToDelete.id });
            setMemberToDelete(null);
        }
    };

    const handleSortRequest = () => {
        setSortConfig(currentConfig => ({
            ...currentConfig,
            direction: currentConfig.direction === 'ascending' ? 'descending' : 'ascending',
        }));
    };

    const handleStartEdit = (member: Member) => {
        setEditingMemberId(member.id);
        setEditedName(member.name);
        setEditError(null);
    };

    const handleCancelEdit = () => {
        setEditingMemberId(null);
        setEditedName('');
        setEditError(null);
    };

    const handleSaveEdit = async () => {
        if (!editingMemberId) return;
        setEditError(null);

        try {
            await updateMemberName({ memberId: editingMemberId, newName: editedName });
            handleCancelEdit();
        } catch (error: any) {
            setEditError(error.message);
        }
    };

    const handleOpenLinkModal = (member: Member) => {
        setMemberToLink(member);
        setIsLinkModalOpen(true);
        setLinkError(null);
    };

    const handleLinkAccount = async (email: string) => {
        if (!memberToLink) return;
        setLinkError(null);
        try {
            // Always use the invitation system for now
            // This ensures the proper flow and email sending
            await inviteUser({ email, name: memberToLink.name, memberId: memberToLink.id });
            setIsLinkModalOpen(false);
            setMemberToLink(null);
        } catch (error: any) {
            setLinkError(error.message);
        }
    };

    const handleUnlinkAccount = async (memberId: string) => {
        try {
            await linkMemberToAccount({ memberId, uid: null });
        } catch (error: any) {
            console.error("Failed to unlink account", error);
            // Optionally set an error state to show in the UI
        }
    };

    const handleResendInvite = async (invite: PendingInvite) => {
        try {
            // Create a new invitation with the same details
            await inviteUser({ 
                email: invite.email, 
                name: invite.invitedUserName, 
                memberId: invite.memberId 
            });
        } catch (error: any) {
            console.error("Failed to resend invitation", error);
        }
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

    // Get pending invite for a specific member
    const getPendingInviteForMember = (memberId: string): PendingInvite | null => {
        return pendingInvites.find(invite => invite.memberId === memberId) || null;
    };





    
    // Get availability month name
    const availabilityMonthName = availabilityMonth 
        ? new Date(availabilityMonth.year, availabilityMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' })
        : '';
    
    const today = new Date();
    
    const commonTableProps = {
        meetingDates: availabilityMeetingDates, // Use availability meeting dates instead
        monthName: availabilityMonthName, // Use availability month name
        editingMemberId, editedName, editError, organization, onNameChange: setEditedName, onStartEdit: handleStartEdit,
        onCancelEdit: handleCancelEdit, onSaveEdit: handleSaveEdit, onLink: handleOpenLinkModal, onUnlink: handleUnlinkAccount,
        onResendInvite: handleResendInvite, onChangeInviteEmail: handleChangeInviteEmail, getPendingInviteForMember,
    };

    // NEW: Check if current month has remaining meetings
    const currentMonthHasRemainingMeetings = useMemo(() => {
        if (!organization?.meetingDay) return false;
        
        const relevantMonths = getRelevantMonthsForAvailability(organization.meetingDay);
        const currentMonth = relevantMonths.current;
        const today = new Date();
        
        // If we're not in the current month, no remaining meetings
        if (today.getFullYear() !== currentMonth.year || today.getMonth() !== currentMonth.month) {
            return false;
        }
        
        // Check if there are meetings left this month
        const meetingDay = organization.meetingDay;
        const lastDay = new Date(currentMonth.year, currentMonth.month + 1, 0);
        let currentDate = new Date(today);
        
        // Find next meeting day
        while (currentDate <= lastDay) {
            if (currentDate.getDay() === meetingDay && currentDate > today) {
                return true;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return false;
    }, [organization?.meetingDay]);

    return (
        <>
            <ConfirmationModal
                isOpen={!!memberToDelete}
                onClose={() => setMemberToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Member"
            >
                <p>
                    Are you sure you want to permanently delete <strong className="text-gray-900 dark:text-white">{memberToDelete?.name}</strong>?
                    This action cannot be undone. They will be removed from all future schedule generation and will appear as '[Deleted Member]' in past schedules.
                </p>
            </ConfirmationModal>
            <LinkAccountModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                onLink={handleLinkAccount}
                memberName={memberToLink?.name || ''}
            />
            {linkError && <p className="text-red-500">{linkError}</p>}
            



            {isAdmin && (
                 <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Add New Member</h2>
                    <form onSubmit={handleAddMember} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                <input
                                    type="text"
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="e.g., Jane Doe"
                                    className="mt-1 flex-grow w-full px-4 py-2 border-2 !border-2 !border-gray-300 dark:!border-gray-600 appearance-none appearance-none rounded-md shadow-sm focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                                <select
                                    id="status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as MemberStatus)}
                                    className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 !border-2 !border-gray-300 dark:!border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-left appearance-none pr-10"
                                >
                                    {Object.values(MemberStatus).filter(s => s !== MemberStatus.Archived).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Qualifications</label>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <AddMemberCheckbox id="isToastmaster" label="Toastmaster" checked={qualifications.isToastmaster} onChange={handleQualificationChange} />
                                <AddMemberCheckbox id="isTableTopicsMaster" label="Table Topics Master" checked={qualifications.isTableTopicsMaster} onChange={handleQualificationChange} />
                                <AddMemberCheckbox id="isGeneralEvaluator" label="General Evaluator" checked={qualifications.isGeneralEvaluator} onChange={handleQualificationChange} />
                                <AddMemberCheckbox id="isPastPresident" label="Past President" checked={qualifications.isPastPresident} onChange={handleQualificationChange} />
                            </div>
                        </div>
                        {addMemberError && <p className="text-sm text-red-600 dark:text-red-400">{addMemberError}</p>}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center bg-[#004165] hover:bg-[#003554] text-white font-bold py-2 px-4 rounded-md transition duration-150"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add Member
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* NEW: Availability Month Selector */}
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6 mb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Availability Management</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Select which month to view and update member availability
                        </p>
                    </div>
                    
                    {/* Quick Month Selector */}
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => handleQuickMonthSelect('current')}
                            className={`flex-1 sm:flex-initial px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                availabilityMonth && availabilityMonth.year === new Date().getFullYear() && availabilityMonth.month === new Date().getMonth()
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-700'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            Current Month
                        </button>
                        <button
                            onClick={() => handleQuickMonthSelect('planning')}
                            className={`flex-1 sm:flex-initial px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                availabilityMonth && availabilityMonth.year === getRelevantMonthsForAvailability(organization?.meetingDay ?? 2).next.year && availabilityMonth.month === getRelevantMonthsForAvailability(organization?.meetingDay ?? 2).next.month
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-700'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            Next Month
                        </button>
                    </div>
                </div>

                {/* Month/Year Selector */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <label className="font-medium text-gray-700 dark:text-gray-300 text-sm sm:text-base">Availability For:</label>
                    <div className="flex gap-3 sm:gap-4">
                        <select 
                            value={availabilityMonthInfo.month} 
                            onChange={e => handleAvailabilityMonthChange('month', Number(e.target.value))} 
                            className="flex-1 sm:w-auto bg-gray-50 dark:bg-gray-700 !border-2 !border-gray-300 dark:!border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#004165] dark:focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-left appearance-none pr-10 min-w-[140px]"
                        >
                            {Array.from({length: 12}, (_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
                        </select>
                        <select 
                            value={availabilityMonthInfo.year} 
                            onChange={e => handleAvailabilityMonthChange('year', Number(e.target.value))} 
                            className="flex-1 sm:w-auto bg-gray-50 dark:bg-gray-700 !border-2 !border-gray-300 dark:!border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#60a5fa] focus:border-[#004165] dark:focus:border-[#60a5fa] text-left appearance-none pr-10 min-w-[120px]"
                        >
                            {Array.from({length: 10}, (_, i) => today.getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
                
                {/* Current Month Indicator and Meeting Day */}
                <div className="flex flex-col gap-3 mt-3 sm:flex-row sm:items-center sm:justify-between">
                    {currentMonthHasRemainingMeetings && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md w-fit">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium">Current month has remaining meetings</span>
                        </div>
                    )}
                    
                    {organization?.meetingDay !== undefined && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Meeting Day: {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][organization.meetingDay]}
                        </span>
                    )}
                </div>
            </div>



            <div className="space-y-8">
                {/* Show "My Availability" section for anyone with a member profile (including admins) */}
                {myProfile && (
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Availability</h2>
                        </div>
                        <MembersTable memberList={[myProfile]} isMyProfileSection={true} isAdmin={false} {...commonTableProps} />
                    </div>
                )}
                
                {/* Show admin interface if user is admin */}
                {isAdmin ? (
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Members</h2>
                        </div>
                        <MembersTable memberList={sortedMembersForAdmin} isAdmin={true} {...commonTableProps} handleSortRequest={handleSortRequest} sortConfig={sortConfig} />
                    </div>
                ) : (
                    /* For non-admins without member profile, show linking message */
                    !myProfile && (
                        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Not Linked</h2>
                            </div>
                            <div className="p-6">
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.257 3.099a.75.75 0 011.486 0l4.205 8.026a.75.75 0 01-.673 1.125H4.722a.75.75 0 01-.673-1.125l4.205-8.026zM10 14a1 1 0 100-2 1 1 0 000 2zm-1-4a1 1 0 011-1h.008a1 1 0 010 2H10a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">Account Not Linked</h3>
                                            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                                                <p>Please ask an admin to link your account to a member profile. This will allow you to manage your own availability.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                )}
                
                {/* For non-admins with member profile, show other members' read-only view */}
                {!isAdmin && myProfile && (
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Other Members' Availability</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This is a read-only view of your club's roster.</p>
                        </div>
                        <MembersTable memberList={otherClubMembers} isAdmin={false} {...commonTableProps} />
                    </div>
                )}
            </div>
            
            {isAdmin && archivedMembers.length > 0 && (
                 <div className="mt-12 bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                         <h3 className="text-xl font-bold text-gray-900 dark:text-white">Archived Members</h3>
                         <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">These members are not included in schedule generation. Reactivate them by changing their status. Only archived members can be permanently deleted.</p>
                    </div>
                     {/* Desktop Table for Archived */}
                    <div className="overflow-x-auto hidden md:block">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                             <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                {archivedMembers.map((member, index) => (
                                    <ArchivedMemberRow 
                                        key={member.id || `archived-member-${index}`} 
                                        member={member} 
                                        onDelete={handleOpenDeleteModal}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Cards for Archived */}
                    <div className="md:hidden space-y-3 p-3 bg-gray-50 dark:bg-gray-900">
                        {archivedMembers.map((member, index) => (
                            <ArchivedMobileMemberCard 
                                key={member.id || `archived-mobile-member-${index}`} 
                                member={member} 
                                onDelete={handleOpenDeleteModal}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};