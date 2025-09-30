

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Member, MonthlySchedule, MemberStatus, MemberAvailability, AvailabilityStatus, Organization, AppUser, UserRole, PendingInvite, WeeklyAgenda } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { deepClone } from '../services/scheduleLogic';
import { useAuth } from './AuthContext';
import { db, FieldValue } from '../services/firebase';
import firebase from 'firebase/compat/app';
import { getUserAdminStatus, ToastmasterAdminStatus } from '../utils/adminTransitionUtils';



interface ToastmastersState {
  schedules: MonthlySchedule[];
  availability: { [memberId: string]: MemberAvailability };
  selectedScheduleId: string | null;
  organization: Organization | null;
  members: Member[]; // Scheduling members (separate from auth users)
  currentUser: AppUser | null;
  ownerId: string | null;
  pendingInvites: PendingInvite[];
  weeklyAgendas: WeeklyAgenda[];
  loading: boolean;
  error: string | null;
  needsEmailVerification: boolean;
  adminStatus: ToastmasterAdminStatus | null;
  addMember: (payload: { name: string; status: MemberStatus; isToastmaster?: boolean; isTableTopicsMaster?: boolean; isGeneralEvaluator?: boolean; isPastPresident?: boolean; }) => Promise<void>;
  updateMemberName: (payload: { memberId: string; newName: string; }) => Promise<void>;
  updateMemberStatus: (payload: { id: string; status: MemberStatus; }) => Promise<void>;
  updateMemberQualifications: (payload: { id: string; qualifications: Partial<Pick<Member, 'isToastmaster' | 'isTableTopicsMaster' | 'isGeneralEvaluator' | 'isPastPresident'>>; }) => Promise<void>;
  setMemberAvailability: (payload: { memberId: string; date: string; status: AvailabilityStatus; }) => Promise<void>;
  addSchedule: (payload: { schedule: MonthlySchedule; }) => Promise<void>;
  updateSchedule: (payload: { schedule: MonthlySchedule; }) => Promise<void>;
  deleteSchedule: (payload: { scheduleId: string; }) => Promise<void>;
  setSelectedScheduleId: (scheduleId: string | null) => void;
  deleteMember: (payload: { memberId: string }) => Promise<void>;
  updateUserName: (payload: { uid: string; newName: string; }) => Promise<void>;
  updateClubProfile: (payload: { name: string; district: string; clubNumber: string; meetingDay?: number; autoNotificationDay?: number; timezone?: string; }) => Promise<void>;
  updateUserRole: (uid: string, newRole: UserRole) => Promise<void>;
  removeUser: (uid: string) => Promise<void>;
  inviteUser: (payload: { email: string, name: string, memberId?: string, excludeInviteId?: string }) => Promise<{ inviteId: string, joinUrl: string } | void>;
  revokeInvite: (inviteId: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  removeFromPendingLinking: (inviteId: string) => Promise<void>;
  linkMemberToAccount: (payload: { memberId: string, uid: string | null }) => Promise<void>;
  linkCurrentUserToMember: (memberId: string) => Promise<void>;
  linkMemberByEmail: (email: string, uid: string) => Promise<void>;
  findAndLinkExistingUser: (memberId: string) => Promise<{ success: boolean; message: string; userEmail?: string }>;
  checkMemberLinkingStatus: (memberId: string) => Promise<{ success: boolean; message?: string; [key: string]: any }>;
  getAllUnlinkedUsers: () => Promise<{ success: boolean; message?: string; totalUsers?: number; unlinkedUsers?: any[]; allUsers?: any[] }>;
  linkMemberToUid: (memberId: string, uid: string) => Promise<{ success: boolean; message: string }>;
  linkMemberToFirebaseAuthUser: (memberId: string, email: string) => Promise<{ success: boolean; message: string }>;
  saveWeeklyAgenda: (agenda: WeeklyAgenda) => Promise<void>;
  deleteWeeklyAgenda: (agendaId: string) => Promise<void>;
}

const ToastmastersContext = createContext<ToastmastersState | undefined>(undefined);

export const ToastmastersProvider = ({ children }: { children: ReactNode }) => {
    const { user, logOut } = useAuth();
    
    const [schedules, setSchedules] = useState<MonthlySchedule[]>([]);
    const [availability, setAvailability] = useState<{ [memberId: string]: MemberAvailability }>({});
    const [selectedScheduleId, setSelectedScheduleIdState] = useState<string | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [dataOwnerId, setDataOwnerId] = useState<string | null>(null);
    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
    const [weeklyAgendas, setWeeklyAgendas] = useState<WeeklyAgenda[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
    const [adminStatus, setAdminStatus] = useState<ToastmasterAdminStatus | null>(null);
    const dataSubscription = useRef<(() => void) | null>(null);
    const invitesSubscription = useRef<(() => void) | null>(null);
    const agendasSubscription = useRef<(() => void) | null>(null);
    
    // Use a ref to track selectedScheduleId to avoid stale closures
    const selectedScheduleIdRef = useRef<string | null>(selectedScheduleId);
    useEffect(() => {
        selectedScheduleIdRef.current = selectedScheduleId;
    }, [selectedScheduleId]);

    const getDataDocRef = useCallback(() => {
        if (!dataOwnerId) return null;
        return db.collection('users').doc(dataOwnerId);
    }, [dataOwnerId]);

    const cleanupSubscriptions = useCallback((resetVerification = true) => {
        if (dataSubscription.current) dataSubscription.current();
        if (invitesSubscription.current) invitesSubscription.current();
        dataSubscription.current = null;
        invitesSubscription.current = null;
        // Only reset verification flag if explicitly requested
        if (resetVerification) {
            setNeedsEmailVerification(false);
        }
    }, []);

    // Function to update admin status based on current data
    const updateAdminStatus = useCallback(() => {
        if (!user?.uid || !organization || !schedules.length || !selectedScheduleId) {
            setAdminStatus(null);
            return;
        }

        const activeSchedule = schedules.find(s => s.id === selectedScheduleId);
        if (!activeSchedule) {
            setAdminStatus(null);
            return;
        }

        const status = getUserAdminStatus(
            user.uid,
            currentUser?.role || 'Member',
            activeSchedule,
            organization,
            members,
            organization.meetingDay || 2,
            organization.timezone || 'UTC'
        );

        setAdminStatus(status);
    }, [user?.uid, organization, schedules, selectedScheduleId, currentUser?.role, members]);

    // Update admin status when relevant data changes
    useEffect(() => {
        updateAdminStatus();
    }, [updateAdminStatus]);

    const linkMemberAccount = useCallback(async (token: string, joiningUser: firebase.User): Promise<string> => {
        const inviteRef = db.collection('invitations').doc(token);
        const inviteDoc = await inviteRef.get();
    
        if (!inviteDoc.exists || inviteDoc.data()?.status !== 'pending' || inviteDoc.data()?.email.toLowerCase() !== joiningUser.email?.toLowerCase()) {
            throw new Error("This invitation is invalid, expired, or for a different email address. Please request a new link.");
        }

        const { ownerId, memberId } = inviteDoc.data()!;
        const clubDataDocRef = db.collection('users').doc(ownerId);
    
        try {
            await db.runTransaction(async (transaction) => {
                const clubDoc = await transaction.get(clubDataDocRef);
                if (!clubDoc.exists) {
                    throw new Error("The club you are trying to join no longer exists.");
                }
        
                // Find the existing member to link
                const existingMembers = clubDoc.data()?.organization?.members || [];
                const memberToLink = existingMembers.find((m: any) => m.id === memberId);
                
                if (!memberToLink) {
                    throw new Error("Member not found. Please contact your club administrator.");
                }
                
                if (memberToLink.uid) {
                    throw new Error("This member is already linked to an account.");
                }
                
                // Simply add the uid to the existing member
                const updatedMembers = existingMembers.map((m: any) => 
                    m.id === memberId ? { 
                        ...m, 
                        uid: joiningUser.uid,
                        email: joiningUser.email || '',
                        role: m.role || UserRole.Member 
                    } : m
                );
                
                // Verify the member was actually updated
                const linkedMember = updatedMembers.find((m: any) => m.id === memberId);
                if (!linkedMember || !linkedMember.uid) {
                    throw new Error("Failed to add UID to member record");
                }
                
                transaction.update(clubDataDocRef, {
                    'organization.members': updatedMembers,
                    'lastJoinToken': token
                });
                
                // Mark invitation as completed
                transaction.update(inviteRef, { 
                    status: 'completed', 
                    completedAt: FieldValue.serverTimestamp(),
                    completedBy: joiningUser.uid
                });
            });
            
            // Redirect to main app after successful join
            window.location.hash = '';
            
            return ownerId;
        } catch (error: any) {
            throw new Error(`Failed to link account: ${error.message}`);
        }
    }, []);

    // Helper function to determine the appropriate schedule to select
    const getAppropriateScheduleId = useCallback((schedules: MonthlySchedule[]): string | null => {
        if (schedules.length === 0) return null;
        
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-based month
        const currentYear = now.getFullYear();
        const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Sort schedules by year and month (most recent first)
        const sortedSchedules = [...schedules].sort((a, b) =>
            (a.year !== b.year) ? b.year - a.year : b.month - a.month
        );
        
        // First, try to find a schedule for the current month
        const currentMonthSchedule = sortedSchedules.find(s => 
            s.year === currentYear && s.month === currentMonth
        );
        
        if (currentMonthSchedule) {
            // Check if the current month schedule has any future meetings
            const hasFutureMeetings = currentMonthSchedule.meetings.some(meeting => {
                if (meeting.isBlackout) return false;
                const meetingDate = new Date(meeting.date + 'T00:00:00');
                return meetingDate >= currentDate;
            });
            
            // If current month has future meetings, use it
            if (hasFutureMeetings) {
                return currentMonthSchedule.id;
            }
            
            // Current month schedule exists but no future meetings - check if we should move to next month
            // Look for next month's schedule
            const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
            const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
            
            const nextMonthSchedule = sortedSchedules.find(s => 
                s.year === nextYear && s.month === nextMonth
            );
            
            if (nextMonthSchedule) {
                // If next month schedule exists, switch to it
                return nextMonthSchedule.id;
            }
        }
        
        // If no current month schedule exists, or current month has no future meetings and no next month,
        // find the most recent schedule with future meetings
        for (const schedule of sortedSchedules) {
            // Check if this schedule has any future meetings
            const hasFutureMeetings = schedule.meetings.some(meeting => {
                if (meeting.isBlackout) return false;
                const meetingDate = new Date(meeting.date + 'T00:00:00');
                return meetingDate >= currentDate;
            });
            
            // If this schedule has future meetings, use it
            if (hasFutureMeetings) {
                return schedule.id;
            }
        }
        
        // If no schedule has future meetings, return the most recent one
        return sortedSchedules[0].id;
    }, []);

    const setupListeners = useCallback((ownerId: string) => {
        if (!user?.uid) {
            return;
        }
        
        const clubDataDocRef = db.collection('users').doc(ownerId);

        dataSubscription.current = clubDataDocRef.onSnapshot(async (doc) => {
            if (!doc.exists) {
                setError("Your club data could not be found. It may have been deleted.");
                setLoading(false);
                cleanupSubscriptions();
                logOut();
                return;
            }

            const data = doc.data()!;
            // Add comprehensive null checks for user and uid
            const me = (user?.uid && data.organization?.members) 
                ? data.organization.members.find((m: AppUser) => m.uid === user.uid) || null 
                : null;

            // Check if email is verified for club owners
            
            // For new accounts: check if emailVerified is explicitly false
            // For existing accounts: check if user.emailVerified is false (Firebase Auth verification status)
            const isNewAccount = data.emailVerified === false;
            const isExistingAccountUnverified = !user.emailVerified && !('emailVerified' in data);
            
            if (user?.uid === ownerId && (isNewAccount || isExistingAccountUnverified)) {
                // Set verification needed flag and stop loading
                setNeedsEmailVerification(true);
                setLoading(false);
                // Don't call cleanupSubscriptions here as it resets needsEmailVerification
                if (dataSubscription.current) dataSubscription.current();
                if (invitesSubscription.current) invitesSubscription.current();
                dataSubscription.current = null;
                invitesSubscription.current = null;
                return;
            }

            if (me && user?.email && user?.uid && me.email !== user.email) {
                const updatedMembers = data.organization.members.map((m: AppUser) =>
                    m.uid === user.uid ? { ...m, email: user.email! } : m
                );
                await clubDataDocRef.update({ 'organization.members': updatedMembers });
                return; 
            }

            // Ensure schedules is always an array (migration fix for old data)
            let loadedSchedules = data.schedules || [];
            if (!Array.isArray(loadedSchedules)) {
                loadedSchedules = [];
            }
            
            // Auto-fix meeting dates if they don't match the meeting day setting
            if (data.organization?.meetingDay !== undefined && loadedSchedules.length > 0) {
                // Import the function dynamically
                import('../utils/monthUtils').then(({ getMeetingDatesForMonth }) => {
                let schedulesUpdated = false;
                
                loadedSchedules = loadedSchedules.map(schedule => {
                    // Check if meeting dates need to be corrected
                    const correctMeetingDates = getMeetingDatesForMonth(
                        schedule.year, 
                        schedule.month, 
                        data.organization.meetingDay, 
                        data.organization.timezone
                    );
                    
                    const currentMeetingDates = schedule.meetings.map(m => m.date);
                    const correctDates = correctMeetingDates.map(d => d.toISOString().split('T')[0]);
                    
                    // Check if dates match
                    const datesMatch = currentMeetingDates.length === correctDates.length &&
                        currentMeetingDates.every((date, index) => date === correctDates[index]);
                    
                    if (!datesMatch) {
                        console.log('🔧 Auto-fixing meeting dates for schedule:', schedule.id);
                        console.log('Current dates:', currentMeetingDates);
                        console.log('Correct dates:', correctDates);
                        
                        schedulesUpdated = true;
                        
                        // Update meeting dates
                        return {
                            ...schedule,
                            meetings: schedule.meetings.map((meeting, index) => ({
                                ...meeting,
                                date: correctDates[index] || meeting.date
                            }))
                        };
                    }
                    
                    return schedule;
                });
                
                // Update database if schedules were corrected
                if (schedulesUpdated) {
                    console.log('💾 Updating schedules in database with corrected meeting dates');
                    const docRef = db.collection('users').doc(ownerId);
                    docRef.update({ schedules: loadedSchedules }).catch(error => {
                        console.error('Failed to update schedules with corrected meeting dates:', error);
                    });
                }
                
                // Update the state with corrected schedules
                setSchedules(deepClone(loadedSchedules));
                }).catch(error => {
                    console.error('Failed to load monthUtils:', error);
                    // Fallback: set schedules without correction
                    setSchedules(deepClone(loadedSchedules));
                });
            } else {
                // No correction needed, set schedules normally
                setSchedules(deepClone(loadedSchedules));
            }
            
            setSchedules(deepClone(loadedSchedules));
            setAvailability(deepClone(data.availability || {}));
            
            // Fix organization structure before setting it
            let correctedOrg = deepClone(data.organization || null);
            if (correctedOrg && !Array.isArray(correctedOrg.members)) {
                correctedOrg.members = [];
            }
            setOrganization(correctedOrg);
            
            // Sync officer roles from organization members to scheduling members
            let schedulingMembers = deepClone(data.members || []);
            if (data.organization?.members) {
                // MIGRATION: Fix organization.members if it's an object instead of array
                let orgMembers = data.organization.members;
                if (!Array.isArray(orgMembers)) {
                    orgMembers = [];
                    // Update the database to fix the structure
                    const docRef = db.collection('users').doc(ownerId);
                    docRef.update({ 'organization.members': orgMembers }).catch((error) => {
                        // Failed to fix organization.members structure
                    });
                }
                
                // MIGRATION: If scheduling members array is empty, populate it from organization members
                // BUT exclude the club admin from being migrated as a regular member
                if (schedulingMembers.length === 0 && orgMembers.length > 0) {
                    schedulingMembers = orgMembers
                        .filter((orgMember: any) => {
                            // Exclude the club admin (ownerId) from regular members
                            return orgMember.uid !== ownerId;
                        })
                        .map((orgMember: any) => {
                            const member: any = {
                                id: orgMember.id || orgMember.uid || uuidv4(),
                                name: orgMember.name || '',
                                status: orgMember.status || 'Active',
                                isToastmaster: orgMember.isToastmaster || false,
                                isTableTopicsMaster: orgMember.isTableTopicsMaster || false,
                                isGeneralEvaluator: orgMember.isGeneralEvaluator || false,
                                isPastPresident: orgMember.isPastPresident || false
                            };
                            
                            // Only add fields that are not undefined
                            if (orgMember.uid !== undefined) member.uid = orgMember.uid;
                            if (orgMember.joinedDate !== undefined) member.joinedDate = orgMember.joinedDate;
                            if (orgMember.ownerId !== undefined) member.ownerId = orgMember.ownerId;
                            if (orgMember.officerRole !== undefined) member.officerRole = orgMember.officerRole;
                            
                            return member;
                        });
                    
                    // Save the migrated data to the database
                    const docRef = db.collection('users').doc(ownerId);
                    docRef.update({ 'members': schedulingMembers }).catch((error) => {
                        // Migration failed
                    });
                } else {
                    // Normal sync: Update scheduling members with officer roles from organization members
                    schedulingMembers.forEach(member => {
                        if (member.uid) {
                            const orgMember = data.organization.members.find((om: any) => om.uid === member.uid);
                            if (orgMember && orgMember.officerRole) {
                                member.officerRole = orgMember.officerRole;
                            }
                        }
                    });
                }
            }
            setMembers(schedulingMembers);
            
            // Ensure weeklyAgendas is always an array (migration fix for old data)
            let loadedWeeklyAgendas = data.weeklyAgendas || [];
            if (!Array.isArray(loadedWeeklyAgendas)) {
                loadedWeeklyAgendas = [];
            }
            setWeeklyAgendas(deepClone(loadedWeeklyAgendas));
            
            // Update email verification status if user is verified
            if (user?.emailVerified && data.emailVerified === false) {
                await clubDataDocRef.update({ emailVerified: true });
                return; // Let the listener reload with updated data
            }
            
            // Set currentUser - prioritize admin field, then organization members, then create from user
            if (me) {
                setCurrentUser(me);
            } else if (user?.uid === ownerId) {
                // User is the club owner, check if admin info is stored separately
                let clubOwnerUser;
                
                if (data.admin) {
                    // Use stored admin info
                    clubOwnerUser = data.admin;
                } else {
                    // Fallback: create admin user from Firebase user info
                    const emailName = user.email!.split('@')[0] || user.email!;
                    clubOwnerUser = {
                        uid: user.uid,
                        email: user.email!,
                        name: user.displayName || emailName,
                        role: UserRole.Admin
                    };
                    
                    // Update the database to store admin info separately
                    try {
                        await clubDataDocRef.update({ admin: clubOwnerUser });
                    } catch (error) {
                        // Failed to update admin info
                    }
                }
                
                setCurrentUser(clubOwnerUser);
                
                // If no organization exists, create one with empty members (admin is separate)
                if (!data.organization) {
                    const initialOrganization = {
                        name: '',
                        district: '',
                        clubNumber: '',
                        ownerId: user.uid,
                        members: [] // Start with empty members array - admin is separate
                    };
                    
                    // Update the database with the initial organization
                    clubDataDocRef.update({ 
                        organization: initialOrganization,
                        schedules: [],
                        weeklyAgendas: []
                    }).catch(error => {
                        // Failed to create initial organization
                    });
                }
            } else {
                // User authorization managed through database ownerId field
                setCurrentUser(null);
            }

            const hasInvitePermission = (user?.uid && user.uid === ownerId) || (me?.role === UserRole.Admin);

            if (hasInvitePermission) {
                if (!invitesSubscription.current) {
                    invitesSubscription.current = db.collection('invitations')
                        .where('ownerId', '==', ownerId)
                        .where('status', '==', 'pending')
                        .onSnapshot((snapshot) => {
                            const invitesData = snapshot.docs.map(doc => ({
                                id: doc.id,
                                ...(doc.data() as Omit<PendingInvite, 'id'>)
                            }));
                            setPendingInvites(invitesData);
                        }, (err) => {
                            setPendingInvites([]);
                        });
                }
            } else {
                if (invitesSubscription.current) {
                    invitesSubscription.current();
                    invitesSubscription.current = null;
                }
                if (pendingInvites.length > 0) {
                    setPendingInvites([]);
                }
            }

            // Only auto-select a schedule if no schedule is currently selected AND this is the initial load
            // If a schedule was previously selected, check if it still exists in the loaded schedules
            // Use the ref to get the current value to avoid stale closures
            const currentSelectedId = selectedScheduleIdRef.current;
            
            if (currentSelectedId !== null && loadedSchedules.length > 0) {
                // Check if the currently selected schedule still exists
                const currentScheduleExists = loadedSchedules.some(s => s.id === currentSelectedId);
                if (!currentScheduleExists) {
                    // Current schedule was deleted, select the most appropriate one
                    const newSelectedId = getAppropriateScheduleId(loadedSchedules);
                    setSelectedScheduleIdState(newSelectedId);
                }
                // If current schedule exists, keep it selected (don't change)
            } else if (currentSelectedId === null && loadedSchedules.length > 0) {
                // Initial load with no schedule selected, select the most appropriate
                const newSelectedId = getAppropriateScheduleId(loadedSchedules);
                setSelectedScheduleIdState(newSelectedId);
            }
            setError(null);
            setLoading(false);
        }, (err) => {
            setError("Failed to load club data. You may not have the required permissions.");
            setLoading(false);
        });
    }, [user, pendingInvites.length, cleanupSubscriptions, logOut]);

    useEffect(() => {
        cleanupSubscriptions();
        
        if (!user) {
            setSchedules([]);
            setAvailability({});
            setSelectedScheduleIdState(null);
            setOrganization(null);
            setMembers([]);
            setCurrentUser(null);
            setDataOwnerId(null);
            setPendingInvites([]);
            setLoading(false);
            return;
        }

        // Add additional safety check to ensure user has required properties
        if (!user.uid || !user.email) {
            return;
        }

        setLoading(true);

        const initializeUserSession = async () => {
            try {
                let ownerIdToUse: string | null = null;
                
                // Check if user is a club owner (has their own club document)
                const potentialClubDoc = await db.collection('users').doc(user.uid).get();
                if (potentialClubDoc.exists && potentialClubDoc.data()?.organization) {
                    ownerIdToUse = user.uid;
                } else {
                    // Check for pending invitation token
                    const token = sessionStorage.getItem('inviteToken');
                    
                    if (token) {
                        try {
                            ownerIdToUse = await linkMemberAccount(token, user);
                            sessionStorage.removeItem('inviteToken');
                        } catch (joinError: any) {
                            throw new Error("Invalid or expired invitation. Please request a new invitation from your club administrator.");
                        }
                    } else {
                        // Search for this user's uid in all club members arrays
                        const usersSnapshot = await db.collection('users').get();
                        
                        for (const doc of usersSnapshot.docs) {
                            const data = doc.data();
                            // Check if user is the club admin
                            if (data.admin && data.admin.uid === user.uid) {
                                ownerIdToUse = doc.id;
                                break;
                            }
                            
                            // Check if user is a regular member
                            if (data.organization?.members) {
                                const member = data.organization.members.find((m: any) => m.uid === user.uid);
                                
                                if (member) {
                                    ownerIdToUse = doc.id;
                                    break;
                                }
                            }
                        }
                        
                        if (!ownerIdToUse) {
                            throw new Error("You are not authorized to access this application. Please contact your club administrator for a proper invitation.");
                        }
                    }
                }
                
                if (ownerIdToUse) {
                    setDataOwnerId(ownerIdToUse);
                    setupListeners(ownerIdToUse);
                } else {
                    throw new Error("You are not authorized to access this application. Please contact your club administrator for an invitation.");
                }
            } catch(e: any) {
                setError(e.message || "Access denied. Please contact your club administrator for assistance.");
                setLoading(false);
            }
        };

        initializeUserSession();

        return () => {
            cleanupSubscriptions();
        };
    }, [user, cleanupSubscriptions, linkMemberAccount, setupListeners]);


    const setSelectedScheduleId = useCallback((scheduleId: string | null) => {
        setSelectedScheduleIdState(scheduleId);
    }, []);

    const updateUserName = async (payload: { uid: string, newName: string }) => {
        const { uid, newName } = payload;
        const docRef = getDataDocRef();
        if (!docRef || !organization) return;

        if (!newName.trim()) {
            throw new Error("Name cannot be empty.");
        }

        // Check if this is the club admin (ownerId)
        if (uid === dataOwnerId) {
            // Update admin info separately
            const updatedAdmin = { ...currentUser!, name: newName.trim() };
            setCurrentUser(updatedAdmin);
            await docRef.update({ admin: updatedAdmin });
        } else {
            // Update regular member
            const updatedMembers = organization.members.map(m => m.uid === uid ? { ...m, name: newName.trim() } : m);
            await docRef.update({ 'organization.members': updatedMembers });
        }
    };

    const updateClubProfile = async (payload: { name: string; district: string; clubNumber: string; meetingDay?: number; autoNotificationDay?: number; timezone?: string; }) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        
        // If no organization exists yet, create a new one with empty members (admin is separate)
        const currentOrg = organization || {
            name: '',
            district: '',
            clubNumber: '',
            ownerId: dataOwnerId || '',
            members: [] // Admin is stored separately, not in members array
        };
        
        const updatedOrg = { 
            ...currentOrg,
            name: payload.name,
            district: payload.district,
            clubNumber: payload.clubNumber,
            ...(payload.meetingDay !== undefined && { meetingDay: payload.meetingDay }),
            ...(payload.autoNotificationDay !== undefined && { autoNotificationDay: payload.autoNotificationDay }),
            ...(payload.timezone !== undefined && { timezone: payload.timezone })
        };

        await docRef.update({ organization: updatedOrg });
    };

    const updateUserRole = async (uid: string, newRole: UserRole) => {
        const docRef = getDataDocRef();
        if (!docRef || !organization || (currentUser?.role !== UserRole.Admin && currentUser?.uid !== dataOwnerId) || uid === dataOwnerId) return;
        
        // Find member by UID first, then by ID if UID is null
        const updatedMembers = organization.members.map(m => {
            if (m.uid === uid || (m.uid === null && m.id === uid)) {
                return { ...m, role: newRole };
            }
            return m;
        });
        
        // Also update the separate members array for scheduling
        const updatedSchedulingMembers = members.map(m => {
            if (m.uid === uid || (m.uid === null && m.id === uid)) {
                return { ...m, role: newRole };
            }
            return m;
        });
        setMembers(updatedSchedulingMembers);
        
        await docRef.update({ 
            'organization.members': updatedMembers,
            'members': updatedSchedulingMembers
        });
    };

    const removeUser = async (uid: string) => {
        const docRef = getDataDocRef();
        if (!docRef || !organization || (currentUser?.role !== UserRole.Admin && currentUser?.uid !== dataOwnerId) || uid === dataOwnerId) return;
        
        const memberToRemove = organization.members.find(m => m.uid === uid);
        if (!memberToRemove) return;
        
        await docRef.update({ 'organization.members': FieldValue.arrayRemove(memberToRemove) });
        await db.collection('users').doc(uid).delete();
    };

    const inviteUser = async (payload: { email: string; name: string; memberId?: string; excludeInviteId?: string }) => {
        const { email, name, memberId, excludeInviteId } = payload;
        if (!dataOwnerId || !currentUser || !organization) {
          throw new Error("Cannot send invite: missing user or organization data.");
        }
        if (currentUser.uid !== dataOwnerId) {
            throw new Error("Only the Club Admin can send invitations.");
        }
      
        const emailLower = email.trim().toLowerCase();
        
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailLower)) {
          throw new Error("Enter a valid email address.");
        }
        // Check if email belongs to a member who is already linked (has UID)
        const existingMember = organization.members.find(m => (m.email || "").toLowerCase() === emailLower);
        if (existingMember && existingMember.uid) {
          throw new Error("That email already belongs to a linked club member.");
        }
        if (pendingInvites.some(inv => inv.email.toLowerCase() === emailLower && inv.id !== excludeInviteId)) {
          throw new Error("You've already sent an invite to this email.");
        }

        // If member exists but has no UID, update their email and create invitation
        if (existingMember && !existingMember.uid) {
            // Update the member's email
            const updatedMembers = organization.members.map(m => 
                m.id === existingMember.id ? { ...m, email: emailLower } : m
            );
            
            const docRef = getDataDocRef();
            if (docRef) {
                await docRef.update({ 'organization.members': updatedMembers });
            }
        }

        // Check if user already exists in Firebase Auth
        try {
            const { getAuth, fetchSignInMethodsForEmail } = await import('firebase/auth');
            const auth = getAuth();
            const signInMethods = await fetchSignInMethodsForEmail(auth, emailLower);
            
            if (signInMethods.length > 0) {
                throw new Error("This email is already registered. The user can sign in directly or use 'Forgot Password' to reset their password.");
            }
        } catch (error: any) {
            if (error.message.includes("already registered")) {
                throw error;
            }
            // If there's an error checking Firebase Auth, continue with the invitation
        }
        
        const newInviteRef = await db.collection("invitations").add({
          ownerId: dataOwnerId,
          inviterEmail: currentUser.email,
          email: emailLower,
          invitedUserName: name || emailLower,
          memberId: memberId, // Link to existing member if provided
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(),
        });
      
        const joinUrl = `https://tmapp.club/#/${organization.clubNumber}/join?token=${newInviteRef.id}`;
        
        
        try {
            await db.collection("mail").add({
              to: [emailLower],
              from: 'tmprofessionallyspeaking@gmail.com', // Use your verified Gmail address
              replyTo: 'tmprofessionallyspeaking@gmail.com',
              message: {
                subject: `You're invited to join ${organization.name}!`,
                html: `
                  <div style="font-family:sans-serif">
                    <h2>Hello ${name || "Future Toastmaster"},</h2>
                    <p>You've been invited by <strong>${organization.name}</strong> to join the Toastmasters Monthly Scheduler app.</p>
                    <p>To accept the invitation, please click the unique link below and create an account using this email address (<strong>${emailLower}</strong>).</p>
                    <a href="${joinUrl}" style="display:inline-block;padding:12px 20px;background:#004165;color:#fff;border-radius:6px;text-decoration:none">Sign Up & Join Now</a>
                    <p style="margin-top:24px;font-size:12px;color:#555;">If you have any questions, please contact your club admin at tmprofessionallyspeaking@gmail.com.</p>
                  </div>`
              }
            });
        } catch (emailError) {
            // Continue anyway - we'll provide the URL manually
        }
        
        // Return the invitation URL for manual sharing if email fails
        return { inviteId: newInviteRef.id, joinUrl };
    };

    const revokeInvite = async (inviteId: string) => {
        if (!dataOwnerId || !currentUser || (currentUser.uid !== dataOwnerId && currentUser.role !== UserRole.Admin)) {
            throw new Error("Only club admins can revoke invitations.");
        }
        await db.collection('invitations').doc(inviteId).delete();
    };

    const removeFromPendingLinking = async (inviteId: string) => {
        if (!dataOwnerId || !currentUser || (currentUser.uid !== dataOwnerId && currentUser.role !== UserRole.Admin)) {
            throw new Error("Only club admins can remove pending invitations.");
        }
        
        // Get the invitation to find the memberId
        const inviteDoc = await db.collection('invitations').doc(inviteId).get();
        if (!inviteDoc.exists) {
            throw new Error("Invitation not found.");
        }
        
        const inviteData = inviteDoc.data();
        if (!inviteData?.memberId) {
            throw new Error("Invalid invitation data.");
        }
        
        // Delete the invitation
        await db.collection('invitations').doc(inviteId).delete();
        
        // Also remove the member from the organization if they exist but aren't linked
        if (organization) {
            const memberToRemove = organization.members.find(m => m.id === inviteData.memberId && !m.uid);
            if (memberToRemove) {
                const docRef = getDataDocRef();
                if (docRef) {
                    await docRef.update({ 'organization.members': FieldValue.arrayRemove(memberToRemove) });
                }
            }
        }
    };

    const sendPasswordResetEmail = async (email: string) => {
        if (!dataOwnerId || !currentUser || (currentUser.uid !== dataOwnerId && currentUser.role !== UserRole.Admin)) {
            throw new Error("Only club admins can send password reset emails.");
        }

        const emailLower = email.trim().toLowerCase();
        
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailLower)) {
            throw new Error("Enter a valid email address.");
        }

        // Send password reset email directly - Firebase will handle user existence check
        try {
            const { getAuth, sendPasswordResetEmail: firebaseSendPasswordReset } = await import('firebase/auth');
            const auth = getAuth();
            
            await firebaseSendPasswordReset(auth, emailLower);

        } catch (error: any) {
            // Handle specific Firebase Auth error codes
            if (error.code === 'auth/user-not-found') {
                throw new Error("No account found with this email address. The user may need to complete their signup first.");
            }
            if (error.code === 'auth/invalid-email') {
                throw new Error("Invalid email address format.");
            }
            if (error.code === 'auth/user-disabled') {
                throw new Error("This user account has been disabled.");
            }
            
            // For other errors, provide the specific Firebase error
            const errorMessage = error.code || error.message || 'Unknown error';
            throw new Error(`Failed to send password reset email: ${errorMessage}`);
        }
    };

    const linkMemberToAccount = async (payload: { memberId: string, uid: string | null }) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        const { memberId, uid } = payload;

        if (!organization) return;
        
        const updatedMembers = deepClone(organization.members);
        
        if (uid) {
            const alreadyLinked = updatedMembers.find(m => m.uid === uid);
            if (alreadyLinked) {
                throw new Error("This user account is already linked to another member profile.");
            }
        }
        
        const memberIndex = updatedMembers.findIndex(m => m.id === memberId);
        if (memberIndex === -1) {
            throw new Error("Member not found.");
        }

        if (uid) {
            updatedMembers[memberIndex].uid = uid;
            // Ensure linked members have the Member role (not Admin)
            if (!updatedMembers[memberIndex].role) {
                updatedMembers[memberIndex].role = UserRole.Member;
            }
        } else {
            delete updatedMembers[memberIndex].uid;
            delete updatedMembers[memberIndex].role;
        }
        
        // Update the database
        await docRef.update({ 'organization.members': updatedMembers });
        
        const updatedOrganization = { ...organization, members: updatedMembers };
        setOrganization(updatedOrganization);
        
        // Also update the separate members array for scheduling
        const updatedSchedulingMembers = members.map(m => m.id === memberId ? { ...m, uid } : m);
        setMembers(updatedSchedulingMembers);
    };

    // New function to directly link the current user to a member
    const linkCurrentUserToMember = async (memberId: string) => {
        if (!user || !dataOwnerId || !organization) {
            throw new Error("Cannot link account: missing user or organization data.");
        }
        
        const docRef = getDataDocRef();
        if (!docRef) return;
        
        const memberToLink = organization.members.find(m => m.id === memberId);
        if (!memberToLink) {
            throw new Error("Member not found.");
        }
        
        if (memberToLink.uid) {
            throw new Error("This member is already linked to an account.");
        }
        
        const updatedMembers = organization.members.map(m => 
            m.id === memberId ? { 
                ...m, 
                uid: user.uid,
                email: user.email || '',
                role: m.role || UserRole.Member 
            } : m
        );
        
        await docRef.update({ 'organization.members': updatedMembers });
    };

    // Manual function to link a member by email to a specific UID
    const linkMemberByEmail = async (email: string, uid: string) => {
        if (!dataOwnerId || !organization) {
            throw new Error("Cannot link account: missing organization data.");
        }
        
        const docRef = getDataDocRef();
        if (!docRef) return;
        
        const memberToLink = organization.members.find(m => 
            (m.email && m.email.toLowerCase() === email.toLowerCase()) || 
            m.name.toLowerCase().includes(email.toLowerCase())
        );
        
        if (!memberToLink) {
            throw new Error(`Member with email ${email} not found.`);
        }
        
        const updatedMembers = organization.members.map(m => 
            m.id === memberToLink.id ? { 
                ...m, 
                uid: uid,
                email: email,
                role: m.role || UserRole.Member 
            } : m
        );
        
        await docRef.update({ 'organization.members': updatedMembers });
    };

    const linkMemberToFirebaseAuthUser = async (memberId: string, email: string) => {
        if (!dataOwnerId || !currentUser || !organization) {
            throw new Error("Cannot link member: missing user or organization data.");
        }
        if (currentUser.uid !== dataOwnerId) {
            throw new Error("Only the Club Admin can link members.");
        }

        try {
            // Find the member
            const member = organization.members.find(m => m.id === memberId);
            if (!member) {
                throw new Error("Member not found.");
            }

            // Check if the email has a Firebase Auth account
            const { getAuth, fetchSignInMethodsForEmail } = await import('firebase/auth');
            const auth = getAuth();
            
            const methods = await fetchSignInMethodsForEmail(auth, email);
            
            if (!methods || methods.length === 0) {
                throw new Error(`No Firebase Auth account found for email ${email}. The user needs to create an account first.`);
            }
            
            // Get the user's UID from Firebase Auth
            // Note: We can't get the UID directly from client-side, but we can create a user document
            // The UID will be available when the user signs in
            
            // For now, we'll create a placeholder that will be updated when the user signs in
            const docRef = getDataDocRef();
            if (!docRef) throw new Error("Database reference not available.");

            // Update the member with the email (UID will be set when user signs in)
            const updatedMembers = organization.members.map(m => 
                m.id === memberId ? { 
                    ...m, 
                    email: email,
                    role: m.role || UserRole.Member 
                } : m
            );
            
            await docRef.update({ 'organization.members': updatedMembers });
            
            // Also update the separate members array for scheduling
            const updatedSchedulingMembers = members.map(m => 
                m.id === memberId ? { ...m, email: email } : m
            );
            setMembers(updatedSchedulingMembers);
            
            return { 
                success: true, 
                message: `Successfully linked ${member.name} to Firebase Auth account (${email}). The user can now sign in and their UID will be automatically linked.`
            };
        } catch (error: any) {
            return { success: false, message: `Error: ${error.message}` };
        }
    };

    const linkMemberToUid = async (memberId: string, uid: string) => {
        if (!dataOwnerId || !currentUser || !organization) {
            throw new Error("Cannot link member: missing user or organization data.");
        }
        if (currentUser.uid !== dataOwnerId) {
            throw new Error("Only the Club Admin can link members.");
        }

        try {
            // Find the member
            const member = organization.members.find(m => m.id === memberId);
            if (!member) {
                throw new Error("Member not found.");
            }

            // For Firebase Auth users, we don't need to check Firestore users collection
            // The UID exists in Firebase Auth (as we can see in the Firebase console)
            // We'll use the member's existing email or the UID as a fallback
            const userData = {
                email: member.email || `${uid}@firebase.auth` // Use member's email or create a fallback
            };

            // Update the member with the UID and email
            const docRef = getDataDocRef();
            if (!docRef) throw new Error("Database reference not available.");

            const updatedMembers = organization.members.map(m => 
                m.id === memberId ? { 
                    ...m, 
                    uid: uid,
                    email: userData?.email || m.email,
                    role: m.role || UserRole.Member 
                } : m
            );
            
            await docRef.update({ 'organization.members': updatedMembers });
            
            // Also update the separate members array for scheduling
            const updatedSchedulingMembers = members.map(m => 
                m.id === memberId ? { ...m, uid: uid, email: userData?.email || m.email } : m
            );
            setMembers(updatedSchedulingMembers);
            
            return { 
                success: true, 
                message: `Successfully linked ${member.name} to user account (${userData?.email}).`
            };
        } catch (error: any) {
            return { success: false, message: `Error: ${error.message}` };
        }
    };

    const getAllUnlinkedUsers = async () => {
        if (!dataOwnerId || !currentUser || !organization) {
            throw new Error("Cannot get unlinked users: missing user or organization data.");
        }
        if (currentUser.uid !== dataOwnerId) {
            throw new Error("Only the Club Admin can view unlinked users.");
        }

        try {
            const usersSnapshot = await db.collection('users').get();
            
            // Get all currently linked UIDs in this club
            const linkedUids = new Set<string>();
            if (organization?.members) {
                organization.members.forEach((member: any) => {
                    if (member.uid) {
                        linkedUids.add(member.uid);
                    }
                });
            }
            
            const allUsers = [];
            const unlinkedUsers = [];
            
            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                
                // Skip club owner documents (they have organization data)
                if (userData.organization) {
                    continue;
                }
                
                const userInfo = {
                    uid: userDoc.id,
                    email: userData.email || 'No email',
                    name: userData.name || userData.displayName || 'Unknown',
                    isLinked: linkedUids.has(userDoc.id)
                };
                
                allUsers.push(userInfo);
                
                if (!userInfo.isLinked) {
                    unlinkedUsers.push(userInfo);
                }
            }
            
            return {
                success: true,
                totalUsers: allUsers.length,
                unlinkedUsers: unlinkedUsers,
                allUsers: allUsers
            };
        } catch (error: any) {
            return { success: false, message: `Error: ${error.message}` };
        }
    };

    const checkMemberLinkingStatus = async (memberId: string) => {
        if (!dataOwnerId || !currentUser || !organization) {
            throw new Error("Cannot check linking status: missing user or organization data.");
        }
        if (currentUser.uid !== dataOwnerId) {
            throw new Error("Only the Club Admin can check linking status.");
        }

        try {
            // Find the member
            const member = organization.members.find(m => m.id === memberId);
            if (!member) {
                return { success: false, message: "Member not found." };
            }

            const result = {
                memberId: member.id,
                memberName: member.name,
                memberEmail: member.email,
                hasUid: !!member.uid,
                uid: member.uid,
                userAccountExists: false,
                userEmail: null,
                isLinked: false,
                linkingStatus: 'unknown'
            };

            if (member.uid) {
                // Check if the user account exists
                const userRef = db.collection('users').doc(member.uid);
                const userDoc = await userRef.get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    result.userAccountExists = true;
                    result.userEmail = userData?.email;
                    result.isLinked = true;
                    result.linkingStatus = 'properly_linked';
                } else {
                    result.linkingStatus = 'uid_exists_but_no_user_account';
                }
            } else {
                result.linkingStatus = 'no_uid_assigned';
            }

            return { success: true, ...result };
        } catch (error: any) {
            return { success: false, message: `Error: ${error.message}` };
        }
    };

    const findAndLinkExistingUser = async (memberId: string) => {
        if (!dataOwnerId || !currentUser || !organization) {
            throw new Error("Cannot search for existing user: missing user or organization data.");
        }
        if (currentUser.uid !== dataOwnerId) {
            throw new Error("Only the Club Admin can link accounts.");
        }

        const docRef = getDataDocRef();
        if (!docRef) return { success: false, message: "Database reference not available." };

        try {
            // Find the member to link - check both organization.members and the separate members array
            let memberToLink = organization.members.find(m => m.id === memberId);
            
            // If not found in organization.members, check the separate members array
            if (!memberToLink) {
                memberToLink = members.find(m => m.id === memberId);
            }
            
            // If still not found, try to find by name (in case of ID mismatch)
            if (!memberToLink && organization.members) {
                // This is a fallback - try to find by name
            }
            
            // Double-check: Get fresh data from database to ensure we have the latest member info
            if (memberToLink) {
                // Refresh the member data from the database to get the most current UID
                const freshOrgData = await docRef.get();
                if (freshOrgData.exists) {
                    const freshOrg = freshOrgData.data();
                    const freshMember = freshOrg?.organization?.members?.find((m: any) => m.id === memberId);
                    if (freshMember) {
                        memberToLink = freshMember; // Use the fresh data
                    }
                }
            }
            
            if (!memberToLink) {
                return { success: false, message: "Member not found." };
            }

            // Check if member already has a uid - if so, verify it's properly linked
            if (memberToLink.uid) {
                // Check if this uid exists in the users collection
                const userRef = db.collection('users').doc(memberToLink.uid);
                const userDoc = await userRef.get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData?.email) {
                        return { 
                            success: true, 
                            message: `This member is already linked to an account (${userData.email}).`,
                            userEmail: userData.email
                        };
                    }
                } else {
                    // UID exists but user document is missing - this is a data inconsistency
                    return {
                        success: false,
                        message: `Member has UID (${memberToLink.uid}) but user account not found. This may be a data inconsistency.`
                    };
                }
            }

            // Check if member has an email - if so, try to find their Firebase Auth account
            if (memberToLink.email) {
                try {
                    // Check if this email has a Firebase Auth account
                    const { getAuth, fetchSignInMethodsForEmail } = await import('firebase/auth');
                    const auth = getAuth();
                    const methods = await fetchSignInMethodsForEmail(auth, memberToLink.email);
                    
                    if (methods && methods.length > 0) {
                        // User has a Firebase Auth account - we need to link them
                        // Since we can't get the UID directly from client-side, we'll create a user document
                        // that will be updated when the user signs in
                        
                        const docRef = getDataDocRef();
                        if (!docRef) return { success: false, message: "Database reference not available." };

                        // Update the member with the email (UID will be set when user signs in)
                        const updatedMembers = organization.members.map(m => 
                            m.id === memberId ? { 
                                ...m, 
                                email: memberToLink.email,
                                role: m.role || UserRole.Member 
                            } : m
                        );
                        
                        await docRef.update({ 'organization.members': updatedMembers });
                        
                        // Also update the separate members array for scheduling
                        const updatedSchedulingMembers = members.map(m => 
                            m.id === memberId ? { ...m, email: memberToLink.email } : m
                        );
                        setMembers(updatedSchedulingMembers);
                        
                        return {
                            success: true,
                            message: `Successfully linked ${memberToLink.name} to their existing Firebase Auth account (${memberToLink.email}). They can now sign in and their UID will be automatically linked.`,
                            userEmail: memberToLink.email
                        };
                    }
                } catch (error) {
                    // If there's an error checking Firebase Auth, continue with normal search
                }
            }
            
            // Search Firestore users collection for unlinked users
            const usersSnapshot = await db.collection('users').get();
            const unlinkedUsers: any[] = [];
            const linkedUids = new Set<string>();
            
            // Get all UIDs that are currently linked to members in THIS club
            if (organization?.members) {
                organization.members.forEach((member: any) => {
                    if (member.uid) {
                        linkedUids.add(member.uid);
                    }
                });
            }

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                
                // Skip if this is a club owner document (has organization data)
                if (userData.organization) {
                    continue;
                }

                // Check if this user is linked to any member in THIS club
                const isLinkedToThisClub = linkedUids.has(userDoc.id);
                
                if (!isLinkedToThisClub) {
                    unlinkedUsers.push({
                        uid: userDoc.id,
                        email: userData.email,
                        name: userData.name || userData.displayName || 'Unknown'
                    });
                }
            }

            // Try to find a match by email first, then by name similarity
            let matchedUser = null;

            // Try exact email match if member has an email
            if (memberToLink.email) {
                matchedUser = unlinkedUsers.find(u => u.email && u.email.toLowerCase() === memberToLink.email.toLowerCase());
            }

            // If no email match, try name similarity
            if (!matchedUser) {
                const memberNameLower = memberToLink.name.toLowerCase();
                matchedUser = unlinkedUsers.find(u => {
                    const userNameLower = u.name.toLowerCase();
                    return userNameLower === memberNameLower || 
                           userNameLower.includes(memberNameLower) || 
                           memberNameLower.includes(userNameLower);
                });
            }

            if (matchedUser) {
                // Link the member to the existing user
                const docRef = getDataDocRef();
                if (!docRef) return { success: false, message: "Database reference not available." };

                const updatedMembers = organization.members.map(m => 
                    m.id === memberId ? { 
                        ...m, 
                        uid: matchedUser.uid,
                        email: matchedUser.email,
                        role: m.role || UserRole.Member 
                    } : m
                );
                
                await docRef.update({ 'organization.members': updatedMembers });
                
                // Also update the separate members array for scheduling
                const updatedSchedulingMembers = members.map(m => 
                    m.id === memberId ? { ...m, uid: matchedUser.uid, email: matchedUser.email } : m
                );
                setMembers(updatedSchedulingMembers);
                
                return { 
                    success: true, 
                    message: `Successfully linked ${memberToLink.name} to existing account (${matchedUser.email}).`,
                    userEmail: matchedUser.email
                };
            } else {
                return { 
                    success: false, 
                    message: `No existing unlinked user account found for ${memberToLink.name}${memberToLink.email ? ` (${memberToLink.email})` : ''}. You can send an invitation to create a new account.`
                };
            }
        } catch (error: any) {
            return { success: false, message: `Error: ${error.message}` };
        }
    };


    const addMember = async (payload: { name: string; status: MemberStatus; isToastmaster?: boolean; isTableTopicsMaster?: boolean; isGeneralEvaluator?: boolean; isPastPresident?: boolean; }) => {
        const docRef = getDataDocRef();
        if (!docRef || !organization) return;
        
        if (organization.members.some(m => m.name.toLowerCase() === payload.name.trim().toLowerCase())) {
            throw new Error("A member with this name already exists.");
        }
        const newMember: Member = { 
            ...payload, 
            name: payload.name.trim(), 
            id: uuidv4(),
            joinedDate: new Date().toISOString(), // Set join date to current date
            ownerId: dataOwnerId // Automatically link new member to the club that created them
        };
        const updatedMembers = [...organization.members, newMember];
        const updatedOrganization = { ...organization, members: updatedMembers };
        setOrganization(updatedOrganization);
        
        // Also add to the separate members array for scheduling
        const updatedSchedulingMembers = [...members, newMember];
        setMembers(updatedSchedulingMembers);
        
        await docRef.update({ 
            'organization': updatedOrganization,
            'members': updatedSchedulingMembers
        });
    };

    const updateMemberName = async (payload: { memberId: string; newName: string; }) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        const { memberId, newName } = payload;
        const trimmedName = newName.trim();

        if (!trimmedName) throw new Error("Member name cannot be empty.");
        if (!organization) return;
        if (organization.members.some(m => m.id !== memberId && m.name.toLowerCase() === trimmedName.toLowerCase())) {
            throw new Error("A member with this name already exists.");
        }
        const updatedMembers = organization.members.map(m => m.id === memberId ? { ...m, name: trimmedName } : m);
        const updatedOrganization = { ...organization, members: updatedMembers };
        setOrganization(updatedOrganization);
        
        // Also update the separate members array for scheduling
        const updatedSchedulingMembers = members.map(m => m.id === memberId ? { ...m, name: trimmedName } : m);
        setMembers(updatedSchedulingMembers);
        
        await docRef.update({ 
            'organization': updatedOrganization,
            'members': updatedSchedulingMembers
        });
    };
    
    const updateMemberStatus = async (payload: { id: string; status: MemberStatus; }) => {
        const docRef = getDataDocRef();
        if (!docRef || !organization) return;
        const { id, status } = payload;
        const updatedMembers = organization.members.map(m => m.id === id ? { ...m, status } : m);
        const updatedOrganization = { ...organization, members: updatedMembers };
        setOrganization(updatedOrganization);
        
        // Also update the separate members array for scheduling
        const updatedSchedulingMembers = members.map(m => m.id === id ? { ...m, status } : m);
        setMembers(updatedSchedulingMembers);
        
        await docRef.update({
            'organization': updatedOrganization,
            'members': updatedSchedulingMembers,
            [`availability.${id}`]: FieldValue.delete()
        });
    };

    const updateMemberJoinDate = async (payload: { memberId: string; joinedDate: string; }) => {
        const docRef = getDataDocRef();
        if (!docRef || !organization) return;
        const { memberId, joinedDate } = payload;
        
        const updatedMembers = organization.members.map(m => 
            m.id === memberId ? { ...m, joinedDate } : m
        );
        const updatedOrganization = { ...organization, members: updatedMembers };
        setOrganization(updatedOrganization);
        await docRef.update({ 'organization': updatedOrganization });
    };
    
    const updateMemberQualifications = async (payload: { id: string; qualifications: Partial<Pick<Member, 'isToastmaster' | 'isTableTopicsMaster' | 'isGeneralEvaluator' | 'isPastPresident'>>; }) => {
        const docRef = getDataDocRef();
        if (!docRef || !organization) return;
        const updatedMembers = organization.members.map(m => m.id === payload.id ? { ...m, ...payload.qualifications } : m);
        const updatedOrganization = { ...organization, members: updatedMembers };
        setOrganization(updatedOrganization);
        
        // Also update the separate members array for scheduling
        const updatedSchedulingMembers = members.map(m => m.id === payload.id ? { ...m, ...payload.qualifications } : m);
        setMembers(updatedSchedulingMembers);
        
        await docRef.update({ 
            'organization': updatedOrganization,
            'members': updatedSchedulingMembers
        });
    };

    const setMemberAvailability = async (payload: { memberId: string; date: string; status: AvailabilityStatus; }) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        const { memberId, date, status } = payload;
    
        const updatePayload: { [key: string]: any } = {};
        const availabilityPath = `availability.${memberId}.${date}`;
    
        if (status === AvailabilityStatus.Available) {
            updatePayload[availabilityPath] = FieldValue.delete();
        } else {
            updatePayload[availabilityPath] = status;
        }
    
        if (status === AvailabilityStatus.Unavailable || status === AvailabilityStatus.Possible) {
            // Ensure schedules is an array before cloning
            if (!Array.isArray(schedules)) {
                return;
            }
            
            const updatedSchedules = deepClone(schedules);
            
            const targetDate = new Date(`${date}T00:00:00Z`);
            const scheduleId = `${targetDate.getUTCFullYear()}-${String(targetDate.getUTCMonth() + 1).padStart(2, '0')}`;
            const scheduleIndex = updatedSchedules.findIndex(s => s.id === scheduleId);
    
            if (scheduleIndex > -1) {
                const schedule = updatedSchedules[scheduleIndex];
                const meetingIndex = schedule.meetings.findIndex(m => m.date === date);
    
                if (meetingIndex > -1) {
                    let scheduleWasModified = false;
                    const meeting = schedule.meetings[meetingIndex];
    
                    for (const role in meeting.assignments) {
                        if (meeting.assignments[role] === memberId) {
                            meeting.assignments[role] = null;
                            scheduleWasModified = true;
                        }
                    }
    
                    if (scheduleWasModified) {
                        updatePayload['schedules'] = updatedSchedules;
                    }
                }
            }
        }
    
        if (Object.keys(updatePayload).length > 0) {
            await docRef.update(updatePayload);
        }
    };

    const addSchedule = async (payload: { schedule: MonthlySchedule; }) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        await docRef.update({ schedules: FieldValue.arrayUnion(payload.schedule) });
        setSelectedScheduleIdState(payload.schedule.id);
    };

    const updateSchedule = async (payload: { schedule: MonthlySchedule; }) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        const updatedSchedules = schedules.map(s => s.id === payload.schedule.id ? payload.schedule : s);
        await docRef.update({ schedules: updatedSchedules });
    };

    const deleteSchedule = async (payload: { scheduleId: string; }) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        const scheduleToDelete = schedules.find(s => s.id === payload.scheduleId);
        if (!scheduleToDelete) return;
        
        await docRef.update({ schedules: FieldValue.arrayRemove(scheduleToDelete) });
        
        if (selectedScheduleId === payload.scheduleId) {
            const remainingSchedules = schedules.filter(s => s.id !== payload.scheduleId);
            const newSelection = getAppropriateScheduleId(remainingSchedules);
            setSelectedScheduleIdState(newSelection);
        }
    };
    
    const deleteMember = async (payload: { memberId: string; }) => {
        const docRef = getDataDocRef();
        if (!docRef || !organization) return;
        const memberToDelete = organization.members.find(m => m.id === payload.memberId);
        if (!memberToDelete) return;

        const updatedMembers = organization.members.filter(m => m.id !== payload.memberId);
        const updatedOrganization = { ...organization, members: updatedMembers };
        setOrganization(updatedOrganization);
        
        // Also remove from the separate members array for scheduling
        const updatedSchedulingMembers = members.filter(m => m.id !== payload.memberId);
        setMembers(updatedSchedulingMembers);

        await docRef.update({ 
            'organization': updatedOrganization,
            'members': updatedSchedulingMembers,
            [`availability.${payload.memberId}`]: FieldValue.delete()
        });
    };

    const saveWeeklyAgenda = async (agenda: WeeklyAgenda) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        
        const existingAgendaIndex = weeklyAgendas.findIndex(a => a.id === agenda.id);
        let updatedAgendas: WeeklyAgenda[];
        
        if (existingAgendaIndex >= 0) {
            // Update existing agenda
            updatedAgendas = [...weeklyAgendas];
            updatedAgendas[existingAgendaIndex] = {
                ...agenda,
                updatedAt: new Date(),
            };
        } else {
            // Add new agenda
            updatedAgendas = [...weeklyAgendas, {
                ...agenda,
                createdAt: new Date(),
                updatedAt: new Date(),
            }];
        }
        
        await docRef.update({ weeklyAgendas: updatedAgendas });
    };

    const deleteWeeklyAgenda = async (agendaId: string) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        
        const updatedAgendas = weeklyAgendas.filter(a => a.id !== agendaId);
        await docRef.update({ weeklyAgendas: updatedAgendas });
    };

    const value = {
        schedules, availability, selectedScheduleId, organization, members, currentUser, ownerId: dataOwnerId, loading, error, needsEmailVerification, pendingInvites, weeklyAgendas, adminStatus,
        addMember, updateMemberName, updateMemberStatus, updateMemberJoinDate, updateMemberQualifications, setMemberAvailability,
        addSchedule, updateSchedule, deleteSchedule, setSelectedScheduleId, deleteMember,
        updateUserName, updateClubProfile, updateUserRole, removeUser, inviteUser, revokeInvite,
        sendPasswordResetEmail, removeFromPendingLinking, linkMemberToAccount, linkCurrentUserToMember, linkMemberByEmail, findAndLinkExistingUser, checkMemberLinkingStatus, getAllUnlinkedUsers, linkMemberToUid, linkMemberToFirebaseAuthUser, saveWeeklyAgenda, deleteWeeklyAgenda
    };

    // Expose functions to window for debugging
    if (typeof window !== 'undefined') {
        (window as any).linkMemberByEmail = linkMemberByEmail;
        (window as any).getAllUnlinkedUsers = getAllUnlinkedUsers;
        (window as any).linkMemberToUid = linkMemberToUid;
        (window as any).linkMemberToFirebaseAuthUser = linkMemberToFirebaseAuthUser;
        
    }


    return (
        <ToastmastersContext.Provider value={value}>
            {loading ? (
                 <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="flex flex-col items-center">
                        <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-xl text-gray-700 dark:text-gray-300">Loading Your Club Data...</p>
                    </div>
                </div>
            ) : needsEmailVerification ? (
                <div className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-blue-900/10 p-4">
                    <div className="text-center bg-white dark:bg-blue-900/20 p-8 rounded-lg shadow-lg border border-blue-200 dark:border-blue-800 max-w-md">
                        <div className="mx-auto h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                            <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-200 mb-4">Email Verification Required</h2>
                        <p className="text-blue-600 dark:text-blue-300 mb-6">
                            Please check your email and click the verification link to access your club. If you don't see the email, check your spam folder.
                        </p>
                        
                        {/* Manual verification option */}
                        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                                Email not received?
                            </h3>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                                If you didn't receive the verification email, you can manually verify your account:
                            </p>
                            <button
                                onClick={async () => {
                                    try {
                                        // Get the verification URL from the database
                                        const userDoc = await db.collection('users').doc(user?.uid).get();
                                        const userData = userDoc.data();
                                        const verificationUrl = userData?.emailVerificationUrl;
                                        
                                        if (verificationUrl) {
                                            // Open the verification URL in a new tab
                                            window.open(verificationUrl, '_blank');
                                            alert('Verification link opened in a new tab. After clicking the link, come back here and click "I\'ve Verified My Email".');
                                        } else {
                                            alert('No verification link found. Please try creating your account again.');
                                        }
                                        } catch (error) {
                                            alert('Error getting verification link. Please try again.');
                                        }
                                }}
                                className="w-full px-3 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 transition-colors"
                            >
                                Open Verification Link Manually
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setNeedsEmailVerification(false);
                                    window.location.reload();
                                }}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                I've Verified My Email
                            </button>
                            <button
                                onClick={() => {
                                    logOut();
                                    setNeedsEmailVerification(false);
                                }}
                                className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            ) : error ? (
                <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/10 p-4">
                    <div className="text-center bg-white dark:bg-red-900/20 p-8 rounded-lg shadow-lg border border-red-200 dark:border-red-800">
                       <h2 className="text-2xl font-bold text-red-800 dark:text-red-200">Access Denied</h2>
                       <p className="text-red-600 dark:text-red-300 mt-2 max-w-md">
                           {error.includes("Could not determine your club association") 
                               ? "You are not authorized to access this application. Please contact your club administrator for an invitation."
                               : error
                           }
                       </p>
                       <div className="mt-4">
                           <button
                               onClick={() => {
                                   logOut();
                                   setError(null);
                               }}
                               className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                           >
                               Sign Out
                           </button>
                       </div>
                   </div>
               </div>
            ) : (
                children
            )}
        </ToastmastersContext.Provider>
    );
};

export const useToastmasters = () => {
  const context = useContext(ToastmastersContext);
  if (context === undefined) {
    throw new Error('useToastmasters must be used within a ToastmastersProvider');
  }
  return context;
};
