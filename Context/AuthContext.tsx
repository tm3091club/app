import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import firebase from 'firebase/compat/app';
import { auth, db } from '../services/firebase';
import { Organization, AppUser, UserRole } from '../types';

const getDefaultWorkingDate = (): string => {
    const today = new Date();
    // Default to the first Wednesday of next month.
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 1));
    d.setUTCDate(d.getUTCDate() + (3 - d.getUTCDay() + 7) % 7);
    return d.toISOString().split('T')[0];
};

interface AuthContextType {
    user: firebase.User | null;
    loading: boolean;
    signUpAndCreateClub: (email: string, password: string, clubDetails: { clubName: string; district: string; clubNumber: string; meetingDay: number; }) => Promise<void>;
    signUpInvitedUser: (email: string, password: string) => Promise<firebase.auth.UserCredential>;
    logIn: (email: string, password: string) => Promise<firebase.auth.UserCredential>;
    logOut: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    updateUserEmail: (currentPassword: string | null, newEmail: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<firebase.User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? 'User signed in' : 'User signed out');
            setUser(user);
            setLoading(false);
        }, (error) => {
            console.error('Auth state change error:', error);
            setUser(null);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signUpAndCreateClub = async (email: string, password: string, clubDetails: { clubName: string; district: string; clubNumber: string; meetingDay: number; }) => {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;
        if (!newUser) {
            throw new Error("User creation failed.");
        }

        const dataDocRef = db.collection('users').doc(newUser.uid);
        const defaultDate = getDefaultWorkingDate();
        const newName = newUser.displayName || newUser.email!;
        const newAppUser: AppUser = { uid: newUser.uid, email: newUser.email!, name: newName, role: UserRole.Admin };
        const newOrg: Organization = {
            name: clubDetails.clubName,
            members: [newAppUser],
            district: clubDetails.district,
            clubNumber: clubDetails.clubNumber,
            ownerId: newUser.uid,
            meetingDay: clubDetails.meetingDay,
        };
        const initialData = {
            members: [],
            schedules: [],
            availability: {},
            workingDate: defaultDate,
            organization: newOrg,
        };
        await dataDocRef.set(initialData);
    };

    const signUpInvitedUser = (email: string, password: string): Promise<firebase.auth.UserCredential> => {
        return auth.createUserWithEmailAndPassword(email, password);
    };


    const logIn = (email: string, password: string) => {
        return auth.signInWithEmailAndPassword(email, password);
    };

    const logOut = () => {
        return auth.signOut();
    };

    const sendPasswordReset = (email: string) => {
        return auth.sendPasswordResetEmail(email);
    };

    const updatePassword = async (currentPassword: string, newPassword: string) => {
        if (!user || !user.email) {
            throw new Error("No user is currently signed in or user has no email.");
        }
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
    };

    const updateUserEmail = async (currentPassword: string | null, newEmail: string) => {
        if (!user || !user.email) {
            throw new Error("Not signed in.");
        }
    
        const providerId = user.providerData[0]?.providerId;
    
        if (providerId === 'password') {
            if (!currentPassword) {
                throw new Error("Please enter your current password to verify your identity.");
            }
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
        } else if (providerId === 'google.com') {
            const provider = new firebase.auth.GoogleAuthProvider();
            await user.reauthenticateWithPopup(provider);
        } else {
            throw new Error(`Email changes for your sign-in method (${providerId}) are not yet supported.`);
        }
    
        // Note: Firebase sends the verification email automatically.
        // We can configure the link to redirect back to our app.
        await user.verifyBeforeUpdateEmail(newEmail);
    };

    const value = {
        user,
        loading,
        signUpAndCreateClub,
        signUpInvitedUser,
        logIn,
        logOut,
        sendPasswordReset,
        updatePassword,
        updateUserEmail,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
