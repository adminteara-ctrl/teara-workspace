import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

export interface PredefinedUser extends UserProfile {
  password: string;
}

export const PREDEFINED_USERS: PredefinedUser[] = [
  {
    uid: 'user_admin',
    username: 'admin',
    password: 'admin123',
    name: 'Admin',
    email: 'admin@teara.internal',
    role: 'admin',
    department: 'R&D',
    jobTitle: 'R&D Lead & Administrator',
    accountStatus: 'active',
    workModePreference: 'hybrid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'user_kunal',
    username: 'kunal',
    password: 'kunal123',
    name: 'Kunal',
    email: 'kunal@teara.internal',
    role: 'employee',
    department: 'R&D',
    jobTitle: 'R&D Engineer',
    accountStatus: 'active',
    workModePreference: 'office',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'user_ayan',
    username: 'ayan',
    password: 'ayan123',
    name: 'Ayan',
    email: 'ayan@teara.internal',
    role: 'employee',
    department: 'R&D',
    jobTitle: 'R&D Engineer',
    accountStatus: 'active',
    workModePreference: 'hybrid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'user_tanmoy',
    username: 'tanmoy',
    password: 'tanmoy123',
    name: 'Tanmoy',
    email: 'tanmoy@teara.internal',
    role: 'employee',
    department: 'R&D',
    jobTitle: 'R&D Engineer',
    accountStatus: 'active',
    workModePreference: 'office',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'user_tanisha',
    username: 'tanisha',
    password: 'tanisha123',
    name: 'Tanisha',
    email: 'tanisha@teara.internal',
    role: 'employee',
    department: 'R&D',
    jobTitle: 'R&D Engineer',
    accountStatus: 'active',
    workModePreference: 'home',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithCredentials: (usernameOrEmail: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  switchUser: (uid: string) => void;
  allUsers: UserProfile[];
  updateCurrentUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(PREDEFINED_USERS);

  // Synchronize 5 predefined users into Firestore on startup
  useEffect(() => {
    async function syncUsersToFirestore() {
      try {
        for (const u of PREDEFINED_USERS) {
          const userRef = doc(db, 'users', u.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: u.uid,
              username: u.username,
              name: u.name,
              email: u.email,
              role: u.role,
              department: u.department,
              jobTitle: u.jobTitle,
              accountStatus: u.accountStatus,
              workModePreference: u.workModePreference,
              createdAt: u.createdAt,
              updatedAt: u.updatedAt,
            });
          }
        }
      } catch (err) {
        console.info('Predefined user sync note:', err);
      }
    }
    syncUsersToFirestore();
  }, []);

  // Check saved session or auth state
  useEffect(() => {
    const savedUserUid = localStorage.getItem('teara_logged_in_uid');
    if (savedUserUid) {
      const found = PREDEFINED_USERS.find((u) => u.uid === savedUserUid);
      if (found) {
        setCurrentUser(found);
      } else {
        setCurrentUser(null);
      }
    } else {
      // Default to null so user sees the Login Page first
      setCurrentUser(null);
    }
    setLoading(false);
  }, []);

  const loginWithCredentials = async (usernameOrEmail: string, password: string): Promise<boolean> => {
    const cleanInput = usernameOrEmail.trim().toLowerCase();
    const cleanPass = password.trim();

    const matched = PREDEFINED_USERS.find(
      (u) =>
        ((u.username && u.username.toLowerCase() === cleanInput) ||
          u.email.toLowerCase() === cleanInput ||
          (cleanInput === 'admin.teara@gmail.com' && u.username === 'admin')) &&
        u.password === cleanPass
    );

    if (matched) {
      setCurrentUser(matched);
      localStorage.setItem('teara_logged_in_uid', matched.uid);
      return true;
    }
    return false;
  };

  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        const isAdminUser =
          res.user.email?.toLowerCase() === 'admin.teara@gmail.com' ||
          res.user.email?.includes('admin');
        const user = isAdminUser ? PREDEFINED_USERS[0] : PREDEFINED_USERS[1];
        setCurrentUser(user);
        localStorage.setItem('teara_logged_in_uid', user.uid);
      }
    } catch (err) {
      console.warn('Google sign in popup fallback:', err);
      setCurrentUser(PREDEFINED_USERS[0]);
      localStorage.setItem('teara_logged_in_uid', PREDEFINED_USERS[0].uid);
    }
  };

  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error(err);
    }
    setCurrentUser(null);
    localStorage.removeItem('teara_logged_in_uid');
  };

  const switchUser = (uid: string) => {
    const selected = PREDEFINED_USERS.find((u) => u.uid === uid);
    if (selected) {
      setCurrentUser(selected);
      localStorage.setItem('teara_logged_in_uid', selected.uid);
    }
  };

  const updateCurrentUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    setCurrentUser(updated);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, updated, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
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
        switchUser,
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
