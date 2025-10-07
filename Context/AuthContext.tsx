import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import firebase from 'firebase/compat/app';
import { auth, db } from '../services/firebase';
import { Organization, AppUser, UserRole } from '../types';


interface AuthContextType {
    user: firebase.User | null;
    loading: boolean;
    signUpAndCreateClub: (email: string, password: string, clubDetails: { clubName: string; district: string; clubNumber: string; meetingDay: number; }) => Promise<void>;
    signUpInvitedUser: (email: string, password: string) => Promise<firebase.auth.UserCredential>;
    logIn: (email: string, password: string) => Promise<firebase.auth.UserCredential>;
    logOut: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    sendEmailVerification: () => Promise<void>;
    updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    updateUserEmail: (currentPassword: string | null, newEmail: string) => Promise<void>;
    verifyEmailWithToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<firebase.User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            // Auth state changed
            setUser(user);
            setLoading(false);
        }, (error) => {
            setUser(null);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signUpAndCreateClub = async (email: string, password: string, clubDetails: { clubName: string; district: string; clubNumber: string; meetingDay: number; }) => {
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;
        if (!newUser) {
            throw new Error("User creation failed.");
        }

        try {
            await sendCustomEmailVerification(newUser.email!, newUser.uid);
        } catch (emailError: any) {
            // Don't throw error - let user proceed with manual verification
        }

        // Create club data but mark as unverified
        // IMPORTANT: This is the ONLY place where user documents should be created
        // User documents are only created when club admins sign up, not for regular members
        const dataDocRef = db.collection('users').doc(newUser.uid);
        
        // Create club admin user - separate from regular members
        // Extract name from email (part before @) or use email if no @ found
        const emailName = newUser.email!.split('@')[0] || newUser.email!;
        const adminName = newUser.displayName || emailName;
        
        const newAppUser: AppUser = { 
            uid: newUser.uid, 
            email: newUser.email!, 
            name: adminName, 
            role: UserRole.Admin 
        };
        
        // Create organization with empty members array - admin is separate
        const newOrg: Organization = {
            name: clubDetails.clubName,
            members: [], // Start with empty members array - admin is not a regular member
            district: clubDetails.district,
            clubNumber: clubDetails.clubNumber,
            ownerId: newUser.uid,
            meetingDay: clubDetails.meetingDay,
        };
        
        const initialData = {
            schedules: [],
            availability: {},
            weeklyAgendas: [],
            organization: newOrg,
            email: newUser.email,
            emailVerified: false,
            clubDetails: clubDetails,
            // Store admin info separately from regular members
            admin: newAppUser
        };
        try {
            await dataDocRef.set(initialData);
        } catch (error) {
            throw new Error('Failed to create club data. Please try again.');
        }

        try {
            await sendCustomEmailVerification(newUser.email!, newUser.uid);
        } catch (emailError) {
            // Don't throw error - let user proceed with manual verification
        }
        
        // Don't throw VERIFICATION_SENT error - let the user proceed to verification page
    };

    const signUpInvitedUser = (email: string, password: string): Promise<firebase.auth.UserCredential> => {
        return auth.createUserWithEmailAndPassword(email, password);
    };


    const logIn = async (email: string, password: string) => {
        try {
            return await auth.signInWithEmailAndPassword(email, password);
        } catch (error: any) {
            // Provide more helpful error messages
            if (error.code === 'auth/user-not-found') {
                throw new Error('No account found with this email address. Please check your email or create a new account.');
            } else if (error.code === 'auth/wrong-password') {
                throw new Error('Incorrect password. Please try again or use "Forgot Password" to reset.');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Please enter a valid email address.');
            } else if (error.code === 'auth/too-many-requests') {
                throw new Error('Too many failed attempts. Please try again later or reset your password.');
            }
            throw error;
        }
    };

    const logOut = () => {
        return auth.signOut();
    };

    const sendPasswordReset = async (email: string) => {
        try {
            // Use Firebase's default password reset but with custom action code settings
            const actionCodeSettings = {
                url: 'https://tmapp.club/#/reset-password',
                handleCodeInApp: false,
            };
            
            return auth.sendPasswordResetEmail(email, actionCodeSettings);
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    };

    const sendCustomPasswordReset = async (email: string) => {
        try {
            // Call the Firebase Function for custom password reset
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions();
            const sendCustomPasswordReset = httpsCallable(functions, 'sendCustomPasswordReset');
            
            const result = await sendCustomPasswordReset({ email });
            return result.data;
        } catch (error) {
            console.error('Custom password reset error:', error);
            // Fallback to default Firebase password reset
            const actionCodeSettings = {
                url: 'https://tmapp.club/#/reset-password',
                handleCodeInApp: false,
            };
            return auth.sendPasswordResetEmail(email, actionCodeSettings);
        }
    };

    const sendCustomEmailVerification = async (email: string, userId: string) => {
        // Use Firebase's built-in email verification instead of custom implementation
        const user = auth.currentUser;
        if (user && user.email === email) {
            try {
                await user.sendEmailVerification({
                    url: `${window.location.origin}/#/`,
                    handleCodeInApp: false
                });
            } catch (emailError) {
                console.warn('Email verification failed:', emailError);
                // Don't throw error - let user proceed
            }
        }
    };

    const sendEmailVerification = async () => {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("No user is currently signed in.");
        }
        await sendCustomEmailVerification(user.email!, user.uid);
    };

    const verifyEmailWithToken = async (token: string) => {
        try {
            // Use Firebase's built-in email verification
            const user = auth.currentUser;
            if (user) {
                await user.reload(); // Refresh user data
                if (user.emailVerified) {
                    // Update the user's email verification status in Firestore
                    await db.collection('users').doc(user.uid).update({
                        emailVerified: true
                    });
                } else {
                    throw new Error('Email not verified. Please check your email and click the verification link.');
                }
            } else {
                throw new Error('No user is currently signed in.');
            }
        } catch (error) {
            throw error;
        }
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
        sendCustomPasswordReset,
        sendEmailVerification,
        updatePassword,
        updateUserEmail,
        verifyEmailWithToken,
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
