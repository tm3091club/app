

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Member, MonthlySchedule, MemberStatus, MemberAvailability, AvailabilityStatus, Organization, AppUser, UserRole, PendingInvite, WeeklyAgenda } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { deepClone } from '../services/scheduleLogic';
import { useAuth } from './AuthContext';
import { db, FieldValue } from '../services/firebase';
import firebase from 'firebase/compat/app';



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
  inviteUser: (payload: { email: string, name: string, memberId?: string }) => Promise<void>;
  revokeInvite: (inviteId: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  linkMemberToAccount: (payload: { memberId: string, uid: string | null }) => Promise<void>;
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

    const cleanupSubscriptions = useCallback(() => {
        if (dataSubscription.current) dataSubscription.current();
        if (invitesSubscription.current) invitesSubscription.current();
        dataSubscription.current = null;
        invitesSubscription.current = null;
    }, []);

    const completeUserJoin = useCallback(async (token: string, joiningUser: firebase.User): Promise<string> => {
        const inviteRef = db.collection('invitations').doc(token);
        const inviteDoc = await inviteRef.get();
    
        if (!inviteDoc.exists || inviteDoc.data()?.status !== 'pending' || inviteDoc.data()?.email.toLowerCase() !== joiningUser.email?.toLowerCase()) {
            throw new Error("This invitation is invalid, expired, or for a different email address. Please request a new link.");
        }
    
        const { ownerId, invitedUserName, memberId } = inviteDoc.data()!;
        const clubDataDocRef = db.collection('users').doc(ownerId);
        const userPointerDocRef = db.collection('users').doc(joiningUser.uid);
    
        const newName = invitedUserName || joiningUser.displayName || joiningUser.email!;
        const newUserToAdd: AppUser = { uid: joiningUser.uid, email: joiningUser.email!, name: newName, role: UserRole.Member, ownerId: ownerId };
    
        try {
            await db.runTransaction(async (transaction) => {
                const clubDoc = await transaction.get(clubDataDocRef);
                if (!clubDoc.exists) {
                    throw new Error("The club you are trying to join no longer exists.");
                }
        
                // Check if user is already a member
                const existingMembers = clubDoc.data()?.organization?.members || [];
                const isAlreadyMember = existingMembers.some((m: AppUser) => m.uid === joiningUser.uid);
                
                if (isAlreadyMember) {
                    throw new Error("You are already a member of this club.");
                }
        
                // Check if this invitation is for an existing member
                const existingSchedulingMembers = clubDoc.data()?.members || [];
                const existingOrgMembers = clubDoc.data()?.organization?.members || [];
                
                console.log('DEBUG: Looking for member to link...');
                console.log('DEBUG: memberId from invitation:', memberId);
                console.log('DEBUG: existingSchedulingMembers:', existingSchedulingMembers);
                console.log('DEBUG: newName:', newName);
                
                let memberToLink = null;
                
                if (memberId) {
                    // Try to find member by memberId first
                    memberToLink = existingSchedulingMembers.find((m: any) => m.id === memberId);
                    console.log('DEBUG: Found member by memberId:', memberToLink);
                }
                
                if (!memberToLink) {
                    // Fallback: try to find member by name and email (for old invitations without memberId)
                    memberToLink = existingSchedulingMembers.find((m: any) => 
                        m.name.toLowerCase() === newName.toLowerCase() && 
                        !m.uid // Only match unlinked members
                    );
                    console.log('DEBUG: Found member by name fallback:', memberToLink);
                }
                
                if (memberToLink) {
                    console.log('DEBUG: Linking existing member to new user account');
                    console.log('DEBUG: memberToLink:', memberToLink);
                    console.log('DEBUG: joiningUser.uid:', joiningUser.uid);
                    
                    // Link the existing member to the new user account
                    const updatedSchedulingMembers = existingSchedulingMembers.map((m: any) => 
                        m.id === memberToLink.id ? { ...m, uid: joiningUser.uid } : m
                    );
                    
                    console.log('DEBUG: updatedSchedulingMembers:', updatedSchedulingMembers);
                    
                    // Add the new user to organization.members (they don't exist there yet)
                    const updatedOrgMembers = [...existingOrgMembers, newUserToAdd];
                    
                    console.log('DEBUG: Creating user pointer document for authentication');
                    
                    // Create user pointer document for authentication system
                    transaction.set(userPointerDocRef, { 
                        ownerId: ownerId, 
                        email: joiningUser.email, 
                        name: newName,
                        joinedAt: FieldValue.serverTimestamp()
                    });
                    
                    transaction.update(clubDataDocRef, {
                        'members': updatedSchedulingMembers,
                        'organization.members': updatedOrgMembers,
                        'lastJoinToken': token
                    });
                    
                    console.log('DEBUG: Successfully linked existing member');
                } else {
                    console.log('DEBUG: No existing member found, creating new user');
                    console.log('DEBUG: This should NOT happen if invitation was sent correctly');
                    
                    // No existing member found, create new user in organization.members
                    // Also create user pointer document for new users
                    transaction.set(userPointerDocRef, { 
                        ownerId: ownerId, 
                        email: joiningUser.email, 
                        name: newName,
                        joinedAt: FieldValue.serverTimestamp()
                    });
                    
                    transaction.update(clubDataDocRef, {
                        'organization.members': FieldValue.arrayUnion(newUserToAdd),
                        'lastJoinToken': token
                    });
                }
                
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
            console.error("Error completing user join:", error);
            throw new Error(`Failed to join club: ${error.message}`);
        }
    }, []);

    const setupListeners = useCallback((ownerId: string) => {
        if (!user?.uid) {
            console.warn('Cannot setup listeners: user.uid is not available');
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

            if (me && user?.email && user?.uid && me.email !== user.email) {
                const updatedMembers = data.organization.members.map((m: AppUser) =>
                    m.uid === user.uid ? { ...m, email: user.email! } : m
                );
                await clubDataDocRef.update({ 'organization.members': updatedMembers });
                return; 
            }

            const loadedSchedules = deepClone(data.schedules || []);
            setSchedules(loadedSchedules);
            setAvailability(deepClone(data.availability || {}));
            setOrganization(deepClone(data.organization || null));
            
            // Sync officer roles from organization members to scheduling members
            let schedulingMembers = deepClone(data.members || []);
            if (data.organization?.members) {
                // MIGRATION: If scheduling members array is empty, populate it from organization members
                if (schedulingMembers.length === 0 && data.organization.members.length > 0) {
                    schedulingMembers = data.organization.members.map((orgMember: any) => {
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
                        console.error('Migration failed:', error);
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
            setWeeklyAgendas(deepClone(data.weeklyAgendas || []));
            
            // Set currentUser - if me is null but user is club owner, create a currentUser object
            if (me) {
                setCurrentUser(me);
            } else if (user?.uid === ownerId) {
                // User is the club owner, create a currentUser object
                const clubOwnerUser = {
                    uid: user.uid,
                    email: user.email!,
                    name: user.displayName || user.email!,
                    role: UserRole.Admin
                };
                setCurrentUser(clubOwnerUser);
                
                // If no organization exists, create one with the owner as the first member
                if (!data.organization) {
                    const initialOrganization = {
                        name: '',
                        district: '',
                        clubNumber: '',
                        ownerId: user.uid,
                        members: [clubOwnerUser]
                    };
                    
                    // Update the database with the initial organization
                    clubDataDocRef.update({ 
                        organization: initialOrganization,
                        schedules: [],
                        weeklyAgendas: []
                    }).catch(error => {
                        console.error('Failed to create initial organization:', error);
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
                            console.error("Error listening to invites:", err);
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
                    // Current schedule was deleted, select the most recent one
                    const sortedSchedules = [...loadedSchedules].sort((a, b) =>
                        (a.year !== b.year) ? b.year - a.year : b.month - a.month
                    );
                    const newSelectedId = sortedSchedules[0].id;
                    setSelectedScheduleIdState(newSelectedId);
                }
                // If current schedule exists, keep it selected (don't change)
            } else if (currentSelectedId === null && loadedSchedules.length > 0) {
                // Initial load with no schedule selected, select the most recent
                const sortedSchedules = [...loadedSchedules].sort((a, b) =>
                    (a.year !== b.year) ? b.year - a.year : b.month - a.month
                );
                const newSelectedId = sortedSchedules[0].id;
                setSelectedScheduleIdState(newSelectedId);
            }
            setError(null);
            setLoading(false);
        }, (err) => {
            console.error("Error listening to club data:", err);
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
            console.warn('User object is incomplete, waiting for authentication to complete');
            return;
        }

        setLoading(true);

        const initializeUserSession = async () => {
            try {
                console.log('Initializing user session for:', user.email);
                const userPointerDocRef = db.collection('users').doc(user.uid);
                const userPointerDoc = await userPointerDocRef.get();
                let ownerIdToUse: string | null = null;
                
                if (userPointerDoc.exists) {
                    const userData = userPointerDoc.data();
                    // Check if this user IS the club owner (has organization data)
                    if (userData?.organization) {
                        ownerIdToUse = user.uid;
                    } else {
                        // This is a member pointing to a club owner
                        ownerIdToUse = userData?.ownerId || user.uid;
                    }
                } else {
                    // Check if user is a club owner (they have their own club)
                    const potentialClubDoc = await db.collection('users').doc(user.uid).get();
                    if (potentialClubDoc.exists && potentialClubDoc.data()?.organization) {
                        ownerIdToUse = user.uid;
                    } else {
                        // Check for pending invitation token
                        const token = sessionStorage.getItem('inviteToken');
                        
                        if (token) {
                            try {
                                ownerIdToUse = await completeUserJoin(token, user);
                                sessionStorage.removeItem('inviteToken');
                            } catch (joinError: any) {
                                console.error(`User join failed:`, joinError);
                                // If join fails, user is not authorized
                                throw new Error("Invalid or expired invitation. Please request a new invitation from your club administrator.");
                            }
                        } else {
                            // Check if user exists as a member with ownerId in any club
                            const usersSnapshot = await db.collection('users').get();
                            
                            for (const doc of usersSnapshot.docs) {
                                const data = doc.data();
                                if (data.organization?.members) {
                                    const member = data.organization.members.find((m: any) => 
                                        m.uid === user.uid || m.email?.toLowerCase() === user.email?.toLowerCase()
                                    );
                                    
                                    if (member?.ownerId) {
                                        ownerIdToUse = member.ownerId;
                                        break;
                                    }
                                }
                            }
                            
                            if (!ownerIdToUse) {
                                throw new Error("You are not authorized to access this application. Please contact your club administrator for a proper invitation.");
                            }
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
                console.error("Error initializing user session:", e);
                setError(e.message || "Access denied. Please contact your club administrator for assistance.");
                setLoading(false);
            }
        };

        initializeUserSession();

        return () => {
            cleanupSubscriptions();
        };
    }, [user, cleanupSubscriptions, completeUserJoin, setupListeners]);


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

        const updatedMembers = organization.members.map(m => m.uid === uid ? { ...m, name: newName.trim() } : m);
        await docRef.update({ 'organization.members': updatedMembers });
    };

    const updateClubProfile = async (payload: { name: string; district: string; clubNumber: string; meetingDay?: number; autoNotificationDay?: number; timezone?: string; }) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        
        // If no organization exists yet, create a new one with the current user as the first member
        const currentOrg = organization || {
            name: '',
            district: '',
            clubNumber: '',
            ownerId: dataOwnerId || '',
            members: currentUser ? [{
                uid: currentUser.uid,
                email: currentUser.email,
                name: currentUser.name,
                role: currentUser.role
            }] : []
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

    const inviteUser = async (payload: { email: string; name: string; memberId?: string }) => {
        const { email, name, memberId } = payload;
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
        if (organization.members.some(m => (m.email || "").toLowerCase() === emailLower)) {
          throw new Error("That email already belongs to a club member.");
        }
        if (pendingInvites.some(inv => inv.email.toLowerCase() === emailLower)) {
          throw new Error("You’ve already sent an invite to this email.");
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
            console.warn("Could not verify if user exists in Firebase Auth:", error);
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
    };

    const revokeInvite = async (inviteId: string) => {
        if (!dataOwnerId || !currentUser || (currentUser.uid !== dataOwnerId && currentUser.role !== UserRole.Admin)) {
            throw new Error("Only club admins can revoke invitations.");
        }
        await db.collection('invitations').doc(inviteId).delete();
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
        
        const updatedOrganization = { ...organization, members: updatedMembers };
        setOrganization(updatedOrganization);
        
        // Also update the separate members array for scheduling
        const updatedSchedulingMembers = members.map(m => m.id === memberId ? { ...m, uid } : m);
        setMembers(updatedSchedulingMembers);
        
        await docRef.update({ 
            'organization': updatedOrganization,
            'members': updatedSchedulingMembers
        });
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
            const newSelection = remainingSchedules.length > 0 ? remainingSchedules.sort((a,b) => b.year - a.year || b.month - a.month)[0].id : null;
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
        schedules, availability, selectedScheduleId, organization, members, currentUser, ownerId: dataOwnerId, loading, error, pendingInvites, weeklyAgendas,
        addMember, updateMemberName, updateMemberStatus, updateMemberJoinDate, updateMemberQualifications, setMemberAvailability,
        addSchedule, updateSchedule, deleteSchedule, setSelectedScheduleId, deleteMember,
        updateUserName, updateClubProfile, updateUserRole, removeUser, inviteUser, revokeInvite,
        sendPasswordResetEmail, linkMemberToAccount, saveWeeklyAgenda, deleteWeeklyAgenda
    };

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
