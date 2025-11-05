import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Experience Mode Context
 *
 * Provides Beginner/Advanced mode toggle for progressive disclosure
 * of advanced features.
 */

type ExperienceMode = 'beginner' | 'advanced';

interface ExperienceModeContextType {
  mode: ExperienceMode;
  setMode: (mode: ExperienceMode) => void;
  isBeginner: boolean;
  isAdvanced: boolean;
}

const ExperienceModeContext = createContext<ExperienceModeContextType | undefined>(undefined);

export function ExperienceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ExperienceMode>('beginner');

  // Load mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('experienceMode');
    if (saved === 'beginner' || saved === 'advanced') {
      setModeState(saved);
    }
  }, []);

  // Save mode to localStorage when it changes
  const setMode = (newMode: ExperienceMode) => {
    setModeState(newMode);
    localStorage.setItem('experienceMode', newMode);
  };

  const value = {
    mode,
    setMode,
    isBeginner: mode === 'beginner',
    isAdvanced: mode === 'advanced',
  };

  return (
    <ExperienceModeContext.Provider value={value}>
      {children}
    </ExperienceModeContext.Provider>
  );
}

export function useExperienceMode() {
  const context = useContext(ExperienceModeContext);
  if (context === undefined) {
    throw new Error('useExperienceMode must be used within ExperienceModeProvider');
  }
  return context;
}
