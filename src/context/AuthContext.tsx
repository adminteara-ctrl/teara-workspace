
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  fbSignOut,
  onAuthStateChanged,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';

import {
  signInWithEmailAndPassword,
  User as FirebaseUser,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithCredentials: (
    usernameOrEmail: string,
    password: string
  ) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  allUsers: UserProfile[];
  updateCurrentUserProfile: (
    data: Partial<UserProfile>
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const loadUserProfile = async (
    firebaseUser: FirebaseUser
  ): Promise<UserProfile | null> => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      return null;
    }

    const profile = userSnapshot.data() as UserProfile;

    if (
      profile.uid !== firebaseUser.uid ||
      profile.accountStatus !== 'active'
    ) {
      return null;
    }

    return profile;
  };

  // Restore and monitor the Firebase Authentication session.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      try {
        if (!firebaseUser) {
          setCurrentUser(null);
          setAllUsers([]);
          setLoading(false);
          return;
        }

        const profile = await loadUserProfile(firebaseUser);

        if (!profile) {
          console.warn('No valid active WorkHub profile for this account.');
          await fbSignOut(auth);
          setCurrentUser(null);
          setAllUsers([]);
          setLoading(false);
          return;
        }

        setCurrentUser(profile);

        if (profile.role === 'admin') {
          try {
            const token = await firebaseUser.getIdToken();
            const response = await fetch('/api/admin/users', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(
                result.error || 'Unable to load the employee directory.'
              );
            }

            const users = Array.isArray(result.users)
              ? result.users as UserProfile[]
              : [];

            setAllUsers(
              users.sort((a, b) =>
                (a.name || '').localeCompare(b.name || '')
              )
            );
          } catch (error) {
            console.error('Unable to load employee directory:', error);
            setAllUsers([]);
          }
        } else {
          setAllUsers([]);
        }
      } catch (error) {
        console.error('Authentication session verification failed:', error);
        setCurrentUser(null);
        setAllUsers([]);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const loginWithCredentials = async (
    usernameOrEmail: string,
    password: string
  ): Promise<boolean> => {
    try {
      const cleanInput = usernameOrEmail.trim().toLowerCase();

      if (!cleanInput || !password) {
        return false;
      }

      let email = cleanInput;

      // Resolve usernames through the backend.
      if (!cleanInput.includes('@')) {
        const response = await fetch('/api/auth/resolve-username', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: cleanInput,
          }),
        });

        if (!response.ok) {
          return false;
        }

        const result = await response.json();
        email = result.email;

        if (typeof email !== 'string' || !email.includes('@')) {
          return false;
        }
      }

      await signInWithEmailAndPassword(auth, email, password);

      // The auth-state listener will load the Firestore profile.
      return true;
    } catch (error) {
      console.warn('Credential sign-in failed:', error);
      return false;
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      await signInWithPopup(auth, googleProvider);

      // The auth-state listener validates the Firestore profile.
      // No automatic admin or employee assignment is performed.
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      await fbSignOut(auth);
    } catch (error) {
      console.error('Sign-out failed:', error);
      throw error;
    }
  };

  const updateCurrentUserProfile = async (
    data: Partial<UserProfile>
  ): Promise<void> => {
    if (!currentUser) {
      throw new Error('You must be signed in to update your profile.');
    }

    // Users must not be able to change their own identity or permissions.
    const safeChanges = { ...data };

    delete safeChanges.uid;
    delete safeChanges.email;
    delete safeChanges.username;
    delete safeChanges.role;
    delete safeChanges.accountStatus;
    delete safeChanges.createdAt;

    const updatedAt = new Date().toISOString();

    try {
      const userRef = doc(db, 'users', currentUser.uid);

      await updateDoc(userRef, {
        ...safeChanges,
        updatedAt,
      });

      setCurrentUser((previous) =>
        previous
          ? {
            ...previous,
            ...safeChanges,
            updatedAt,
          }
          : null
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `users/${currentUser.uid}`
      );
      throw error;
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isAdmin,
        loginWithCredentials,
        signInWithGoogle: handleGoogleSignIn,
        signOut: handleSignOut,
        allUsers,
        updateCurrentUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
