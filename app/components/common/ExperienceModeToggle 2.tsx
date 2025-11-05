import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Button, Icon, Popover, ActionList, Banner } from '@shopify/polaris';
import { QuestionCircleIcon } from '@shopify/polaris-icons';

type ExperienceMode = 'beginner' | 'advanced';

interface ExperienceModeContextType {
  mode: ExperienceMode;
  setMode: (mode: ExperienceMode) => void;
  isFeatureVisible: (feature: string) => boolean;
}

const ExperienceModeContext = createContext<ExperienceModeContextType | undefined>(undefined);

// Feature visibility configuration
const BEGINNER_FEATURES = new Set([
  'dashboard',
  'seo-score',
  'quick-wins',
  'page-editor',
  'serp-preview',
  'basic-audit',
  'meta-tags',
]);

const ADVANCED_FEATURES = new Set([
  'dashboard',
  'seo-score',
  'quick-wins',
  'page-editor',
  'serp-preview',
  'basic-audit',
  'meta-tags',
  // Advanced only:
  'bulk-edit',
  'schema-manager',
  'keyword-tracking',
  'gsc-integration',
  'redirects',
  'internal-linking',
  'ai-suggestions',
  'site-speed',
  'competitor-analysis',
  'advanced-analytics',
]);

export function ExperienceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ExperienceMode>(() => {
    const saved = localStorage.getItem('experienceMode');
    return (saved as ExperienceMode) || 'beginner';
  });

  const setMode = (newMode: ExperienceMode) => {
    setModeState(newMode);
    localStorage.setItem('experienceMode', newMode);
  };

  const isFeatureVisible = (feature: string): boolean => {
    if (mode === 'advanced') {
      return ADVANCED_FEATURES.has(feature);
    }
    return BEGINNER_FEATURES.has(feature);
  };

  return (
    <ExperienceModeContext.Provider value={{ mode, setMode, isFeatureVisible }}>
      {children}
    </ExperienceModeContext.Provider>
  );
}

export function useExperienceMode() {
  const context = useContext(ExperienceModeContext);
  if (!context) {
    throw new Error('useExperienceMode must be used within ExperienceModeProvider');
  }
  return context;
}

export function ExperienceModeToggle() {
  const { mode, setMode } = useExperienceMode();
  const [popoverActive, setPopoverActive] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const togglePopover = () => setPopoverActive((active) => !active);

  const handleModeChange = (newMode: ExperienceMode) => {
    setMode(newMode);
    setPopoverActive(false);
    setShowBanner(true);
    setTimeout(() => setShowBanner(false), 5000);
  };

  const activator = (
    <Button
      onClick={togglePopover}
      disclosure={popoverActive ? 'up' : 'down'}
      icon={QuestionCircleIcon}
    >
      {mode === 'beginner' ? 'Beginner' : 'Advanced'} Mode
    </Button>
  );

  return (
    <>
      <Popover
        active={popoverActive}
        activator={activator}
        onClose={togglePopover}
        preferredAlignment="right"
      >
        <ActionList
          items={[
            {
              content: 'Beginner Mode',
              helpText: 'Simplified interface with essential features',
              onAction: () => handleModeChange('beginner'),
              active: mode === 'beginner',
            },
            {
              content: 'Advanced Mode',
              helpText: 'Full access to all features and settings',
              onAction: () => handleModeChange('advanced'),
              active: mode === 'advanced',
            },
          ]}
        />
      </Popover>

      {showBanner && (
        <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 1000, maxWidth: '400px' }}>
          <Banner
            tone="success"
            onDismiss={() => setShowBanner(false)}
          >
            Switched to {mode === 'beginner' ? 'Beginner' : 'Advanced'} Mode
          </Banner>
        </div>
      )}
    </>
  );
}

// Feature Gate Component
interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { isFeatureVisible } = useExperienceMode();

  if (!isFeatureVisible(feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Hook for conditional rendering
export function useFeatureGate(feature: string): boolean {
  const { isFeatureVisible } = useExperienceMode();
  return isFeatureVisible(feature);
}
