import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    User, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    GoogleAuthProvider,
    GithubAuthProvider,
    signInWithPopup,
    AuthError
} from 'firebase/auth';
import { auth } from '../firebase.ts';
import { UserProfile } from '../types.ts';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (email: string, pass: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithGitHub: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const formatUser = (user: User): UserProfile => ({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
});

const getFirebaseAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Invalid email or password. Please try again.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'The password is too weak. It must be at least 6 characters long.';
        case 'auth/invalid-email':
            return 'The email address is not valid.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in process was cancelled.';
        case 'auth/account-exists-with-different-credential':
            return 'An account already exists with the same email address but different sign-in credentials.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(formatUser(firebaseUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthAction = async (action: Promise<any>): Promise<boolean> => {
    setError(null);
    try {
      await action;
      return true;
    } catch (e) {
      const authError = e as AuthError;
      console.error("Firebase Auth Error:", authError);
      setError(getFirebaseAuthErrorMessage(authError.code));
      return false;
    }
  };

  const login = (email: string, pass: string) => 
    handleAuthAction(signInWithEmailAndPassword(auth, email, pass));

  const signup = (email: string, pass: string) => 
    handleAuthAction(createUserWithEmailAndPassword(auth, email, pass));
  
  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return handleAuthAction(signInWithPopup(auth, provider));
  };
    
  const signInWithGitHub = () => {
    const provider = new GithubAuthProvider();
    return handleAuthAction(signInWithPopup(auth, provider));
  };

  const logout = async () => {
    setUser(null);
    await signOut(auth);
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    signup,
    signInWithGoogle,
    signInWithGitHub,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
