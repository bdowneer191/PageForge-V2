
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types.ts';

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const userData = await res.json();
          setUser(userData.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch user', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const apiCall = async (endpoint: string, body: object) => {
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'An unknown error occurred.');
      }
      setUser(data.user);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };
  
  const login = async (email: string, pass: string) => {
    return apiCall('/api/auth/login', { email, password: pass });
  };

  const signup = async (email: string, pass: string) => {
    return apiCall('/api/auth/signup', { email, password: pass });
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    // Redirect to home to clear state
    window.location.pathname = '/';
  };

  const value = { user, login, signup, logout, loading, error };

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
