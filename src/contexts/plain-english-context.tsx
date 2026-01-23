'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PlainEnglishContextType {
  plainMode: boolean;
  togglePlainMode: () => void;
  setPlainMode: (value: boolean) => void;
}

const PlainEnglishContext = createContext<PlainEnglishContextType | undefined>(undefined);

const STORAGE_KEY = 'bugrit-plain-english-mode';

export function PlainEnglishProvider({ children }: { children: ReactNode }) {
  // Default to plain mode ON for new users
  const [plainMode, setPlainModeState] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setPlainModeState(stored === 'true');
    }
    // If no stored preference, default to true (plain mode on)
  }, []);

  const setPlainMode = (value: boolean) => {
    setPlainModeState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  const togglePlainMode = () => {
    setPlainMode(!plainMode);
  };

  // Prevent hydration mismatch by not rendering children until mounted
  if (!mounted) {
    return null;
  }

  return (
    <PlainEnglishContext.Provider value={{ plainMode, togglePlainMode, setPlainMode }}>
      {children}
    </PlainEnglishContext.Provider>
  );
}

export function usePlainEnglish() {
  const context = useContext(PlainEnglishContext);
  if (context === undefined) {
    throw new Error('usePlainEnglish must be used within a PlainEnglishProvider');
  }
  return context;
}
