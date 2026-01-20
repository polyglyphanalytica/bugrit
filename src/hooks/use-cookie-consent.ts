'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CookiePreferences,
  getCookiePreferences,
  getConsentStatus,
  hasConsentBeenGiven,
  saveCookiePreferences,
  onConsentChange,
} from '@/lib/cookies';

/**
 * React hook for accessing and managing cookie consent
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { preferences, canUseAnalytics, updatePreferences } = useCookieConsent();
 *
 *   useEffect(() => {
 *     if (canUseAnalytics) {
 *       // Initialize analytics
 *     }
 *   }, [canUseAnalytics]);
 * }
 * ```
 */
export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences>(() => getCookiePreferences());
  const [consentStatus, setConsentStatus] = useState<string | null>(() => getConsentStatus());
  const [hasConsent, setHasConsent] = useState(() => hasConsentBeenGiven());

  // Subscribe to consent changes
  useEffect(() => {
    const unsubscribe = onConsentChange((status, prefs) => {
      setConsentStatus(status);
      setPreferences(prefs);
      setHasConsent(true);
    });

    return unsubscribe;
  }, []);

  const updatePreferences = useCallback((
    status: 'accepted' | 'rejected' | 'customized',
    newPreferences: CookiePreferences
  ) => {
    saveCookiePreferences(status, newPreferences);
    setPreferences(newPreferences);
    setConsentStatus(status);
    setHasConsent(true);
  }, []);

  return {
    // Current preferences
    preferences,
    consentStatus,
    hasConsent,

    // Convenience booleans for each category
    canUseFunctional: preferences.functional,
    canUseAnalytics: preferences.analytics,
    canUseMarketing: preferences.marketing,

    // Methods
    updatePreferences,
  };
}
