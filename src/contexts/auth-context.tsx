'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  onAuthChange,
  logout as firebaseLogout,
  isDemoMode,
} from '@/lib/firebase-auth';
import { User } from '@/lib/types';
import { devConsole } from '@/lib/console';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  logout: () => Promise<void>;
  setDemoUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo] = useState(isDemoMode());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    // If in demo mode and no Firebase, stop loading after a short delay
    if (isDemo) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 100);
      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    }

    return unsubscribe;
  }, [isDemo]);

  const logout = async () => {
    try {
      await firebaseLogout();
      setUser(null);
    } catch (error) {
      devConsole.error('Logout error:', error);
      // Still clear user on client side
      setUser(null);
    }
  };

  // For demo mode - allow setting user after login
  const setDemoUser = (demoUser: User) => {
    setUser(demoUser);
  };

  const value: AuthContextType = {
    user,
    loading,
    isDemo,
    logout,
    setDemoUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
