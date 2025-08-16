

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Member, MonthlySchedule, MemberStatus, MemberAvailability, AvailabilityStatus, Organization, AppUser, UserRole, PendingInvite } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { deepClone } from '../services/scheduleLogic';
import { useAuth } from './AuthContext';
import { db, FieldValue } from '../services/firebase';
import firebase from 'firebase/compat/app';


const getDefaultWorkingDate = (): string => {
    const today = new Date();
    // Default to the first Wednesday of next month.
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 1));
    d.setUTCDate(d.getUTCDate() + (3 - d.getUTCDay() + 7) % 7);
    return d.toISOString().split('T')[0];
};

interface ToastmastersState {
  members: Member[];
  schedules: MonthlySchedule[];
  availability: { [memberId: string]: MemberAvailability };
  workingDate: string | null;
  selectedScheduleId: string | null;
  organization: Organization | null;
  currentUser: AppUser | null;
  ownerId: string | null;
  pendingInvites: PendingInvite[];
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
  setWorkingDate: (date: string | null) => Promise<void>;
  setSelectedScheduleId: (scheduleId: string | null) => void;
  deleteMember: (payload: { memberId: string }) => Promise<void>;
  updateUserName: (payload: { uid: string; newName: string; }) => Promise<void>;
  updateClubProfile: (payload: { name: string; district: string; clubNumber: string; meetingDay?: number; autoNotificationDay?: number; }) => Promise<void>;
  updateUserRole: (uid: string, newRole: UserRole) => Promise<void>;
  removeUser: (uid: string) => Promise<void>;
  inviteUser: (payload: { email: string, name: string }) => Promise<void>;
  revokeInvite: (inviteId: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  linkMemberToAccount: (payload: { memberId: string, uid: string | null }) => Promise<void>;
}

const ToastmastersContext = createContext<ToastmastersState | undefined>(undefined);

export const ToastmastersProvider = ({ children }: { children: ReactNode }) => {
    const { user, logOut } = useAuth();
    
    const [members, setMembers] = useState<Member[]>([]);
    const [schedules, setSchedules] = useState<MonthlySchedule[]>([]);
    const [availability, setAvailability] = useState<{ [memberId: string]: MemberAvailability }>({});
    const [workingDate, setWorkingDateState] = useState<string | null>(null);
    const [selectedScheduleId, setSelectedScheduleIdState] = useState<string | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [dataOwnerId, setDataOwnerId] = useState<string | null>(null);
    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const dataSubscription = useRef<(() => void) | null>(null);
    const invitesSubscription = useRef<(() => void) | null>(null);

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
    
        const { ownerId, invitedUserName } = inviteDoc.data()!;
        const clubDataDocRef = db.collection('users').doc(ownerId);
        const userPointerDocRef = db.collection('users').doc(joiningUser.uid);
    
        const newName = invitedUserName || joiningUser.displayName || joiningUser.email!;
        const newUserToAdd: AppUser = { uid: joiningUser.uid, email: joiningUser.email!, name: newName, role: UserRole.Member };
    
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
        
                // Create user pointer document
                transaction.set(userPointerDocRef, { 
                    ownerId: ownerId, 
                    email: joiningUser.email, 
                    name: newName,
                    joinedAt: FieldValue.serverTimestamp()
                });
                
                // Add user to club's member list
                transaction.update(clubDataDocRef, {
                    'organization.members': FieldValue.arrayUnion(newUserToAdd),
                    'lastJoinToken': token // Temporary field for security rule validation
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
            setMembers(deepClone(data.members || []));
            setSchedules(loadedSchedules);
            setAvailability(deepClone(data.availability || {}));
            setOrganization(deepClone(data.organization));
            setCurrentUser(me);

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

            let initialWorkingDate = data.workingDate || null;
            if (selectedScheduleId === null && loadedSchedules.length > 0) {
                const sortedSchedules = [...loadedSchedules].sort((a, b) =>
                    (a.year !== b.year) ? b.year - a.year : b.month - a.month
                );
                const newSelectedId = sortedSchedules[0].id;
                setSelectedScheduleIdState(newSelectedId);
                if (sortedSchedules[0].meetings.length > 0) {
                    initialWorkingDate = sortedSchedules[0].meetings[0].date.split('T')[0];
                }
            }

            setWorkingDateState(current => current || initialWorkingDate || getDefaultWorkingDate());
            setError(null);
            setLoading(false);
        }, (err) => {
            console.error("Error listening to club data:", err);
            setError("Failed to load club data. You may not have the required permissions.");
            setLoading(false);
        });
    }, [user, selectedScheduleId, pendingInvites.length, cleanupSubscriptions, logOut]);

    useEffect(() => {
        cleanupSubscriptions();
        
        if (!user) {
            setMembers([]); setSchedules([]); setAvailability({});
            setWorkingDateState(null); setSelectedScheduleIdState(null);
            setOrganization(null); setCurrentUser(null);
            setDataOwnerId(null); setPendingInvites([]);
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
                    // User has a pointer document - they are a club member
                    ownerIdToUse = userPointerDoc.data()?.ownerId || user.uid;
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
                            // No invitation token and no club association - user is not authorized
                            throw new Error("You are not authorized to access this application. Please contact your club administrator for an invitation.");
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

    // Effect to update working date when selected schedule changes
    useEffect(() => {
        if (selectedScheduleId && schedules.length > 0) {
            const schedule = schedules.find(s => s.id === selectedScheduleId);
            if (schedule && schedule.meetings.length > 0) {
                const newWorkingDate = schedule.meetings[0].date.split('T')[0];
                setWorkingDate(newWorkingDate);
            }
        }
    }, [selectedScheduleId, schedules]);

    const setWorkingDate = async (date: string | null) => {
        setWorkingDateState(date);
        const docRef = getDataDocRef();
        if (docRef) {
            await docRef.set({ workingDate: date }, { merge: true });
        }
    };

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

    const updateClubProfile = async (payload: { name: string; district: string; clubNumber: string; meetingDay?: number; autoNotificationDay?: number; }) => {
        const docRef = getDataDocRef();
        if (!docRef || !organization) return;
        
        const updatedOrg = { 
            ...organization,
            name: payload.name,
            district: payload.district,
            clubNumber: payload.clubNumber,
            ...(payload.meetingDay !== undefined && { meetingDay: payload.meetingDay }),
            ...(payload.autoNotificationDay !== undefined && { autoNotificationDay: payload.autoNotificationDay })
        };

        await docRef.update({ organization: updatedOrg });
    };

    const updateUserRole = async (uid: string, newRole: UserRole) => {
        const docRef = getDataDocRef();
        if (!docRef || !organization || (currentUser?.role !== UserRole.Admin && currentUser?.uid !== dataOwnerId) || uid === dataOwnerId) return;
        
        const updatedMembers = organization.members.map(m => m.uid === uid ? { ...m, role: newRole } : m);
        await docRef.update({ 'organization.members': updatedMembers });
    };

    const removeUser = async (uid: string) => {
        const docRef = getDataDocRef();
        if (!docRef || !organization || (currentUser?.role !== UserRole.Admin && currentUser?.uid !== dataOwnerId) || uid === dataOwnerId) return;
        
        const memberToRemove = organization.members.find(m => m.uid === uid);
        if (!memberToRemove) return;
        
        await docRef.update({ 'organization.members': FieldValue.arrayRemove(memberToRemove) });
        await db.collection('users').doc(uid).delete();
    };

    const inviteUser = async (payload: { email: string; name: string }) => {
        const { email, name } = payload;
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

        const updatedMembers = deepClone(members);
        
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
        } else {
            delete updatedMembers[memberIndex].uid;
        }
        
        await docRef.update({ members: updatedMembers });
    };


    const addMember = async (payload: { name: string; status: MemberStatus; isToastmaster?: boolean; isTableTopicsMaster?: boolean; isGeneralEvaluator?: boolean; isPastPresident?: boolean; }) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        
        if (members.some(m => m.name.toLowerCase() === payload.name.trim().toLowerCase())) {
            throw new Error("A member with this name already exists.");
        }
        const newMember: Member = { ...payload, name: payload.name.trim(), id: uuidv4() };
        await docRef.update({ members: FieldValue.arrayUnion(newMember) });
    };

    const updateMemberName = async (payload: { memberId: string; newName: string; }) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        const { memberId, newName } = payload;
        const trimmedName = newName.trim();

        if (!trimmedName) throw new Error("Member name cannot be empty.");
        if (members.some(m => m.id !== memberId && m.name.toLowerCase() === trimmedName.toLowerCase())) {
            throw new Error("A member with this name already exists.");
        }
        const updatedMembers = members.map(m => m.id === memberId ? { ...m, name: trimmedName } : m);
        await docRef.update({ members: updatedMembers });
    };
    
    const updateMemberStatus = async (payload: { id: string; status: MemberStatus; }) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        const { id, status } = payload;
        const updatedMembers = members.map(m => m.id === id ? { ...m, status } : m);
        
        await docRef.update({
            members: updatedMembers,
            [`availability.${id}`]: FieldValue.delete()
        });
    };
    
    const updateMemberQualifications = async (payload: { id: string; qualifications: Partial<Pick<Member, 'isToastmaster' | 'isTableTopicsMaster' | 'isGeneralEvaluator' | 'isPastPresident'>>; }) => {
        const docRef = getDataDocRef();
        if (!docRef) return;
        const updatedMembers = members.map(m => m.id === payload.id ? { ...m, ...payload.qualifications } : m);
        await docRef.update({ members: updatedMembers });
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
        if (!docRef) return;
        const memberToDelete = members.find(m => m.id === payload.memberId);
        if (!memberToDelete) return;

        await docRef.update({ 
            members: FieldValue.arrayRemove(memberToDelete),
            [`availability.${payload.memberId}`]: FieldValue.delete()
        });
    };

    const value = {
        members, schedules, availability, workingDate, selectedScheduleId, organization, currentUser, ownerId: dataOwnerId, loading, error, pendingInvites,
        addMember, updateMemberName, updateMemberStatus, updateMemberQualifications, setMemberAvailability,
        addSchedule, updateSchedule, deleteSchedule, setWorkingDate, setSelectedScheduleId, deleteMember,
        updateUserName, updateClubProfile, updateUserRole, removeUser, inviteUser, revokeInvite,
        sendPasswordResetEmail, linkMemberToAccount
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
