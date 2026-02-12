/**
 * Cookie Consent Utilities
 *
 * This module provides utilities for checking and managing cookie consent
 * throughout the application. All scripts and tracking should check consent
 * before initializing.
 */

import { devConsole } from '@/lib/console';

export interface CookiePreferences {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = 'buggered_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'buggered_cookie_preferences';

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

/**
 * Check if we're running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get the current cookie consent status
 * Returns null if user hasn't made a choice yet
 */
export function getConsentStatus(): 'accepted' | 'rejected' | 'customized' | null {
  if (!isBrowser()) return null;

  const status = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (status === 'accepted' || status === 'rejected' || status === 'customized') {
    return status;
  }
  return null;
}

/**
 * Check if user has made any consent choice
 */
export function hasConsentBeenGiven(): boolean {
  return getConsentStatus() !== null;
}

/**
 * Get the current cookie preferences
 * Returns default (necessary only) if no preferences saved
 */
export function getCookiePreferences(): CookiePreferences {
  if (!isBrowser()) return DEFAULT_PREFERENCES;

  try {
    const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored) as CookiePreferences;
    }
  } catch (e) {
    devConsole.error('Failed to parse cookie preferences:', e);
  }

  return DEFAULT_PREFERENCES;
}

/**
 * Check if a specific cookie category is allowed
 */
export function isCookieCategoryAllowed(category: keyof CookiePreferences): boolean {
  const preferences = getCookiePreferences();
  return preferences[category] ?? false;
}

/**
 * Check if functional cookies are allowed
 * Use this before storing user preferences, themes, etc.
 */
export function canUseFunctionalCookies(): boolean {
  return isCookieCategoryAllowed('functional');
}

/**
 * Check if analytics cookies are allowed
 * Use this before initializing analytics (Google Analytics, Mixpanel, etc.)
 */
export function canUseAnalytics(): boolean {
  return isCookieCategoryAllowed('analytics');
}

/**
 * Check if marketing cookies are allowed
 * Use this before initializing marketing/advertising scripts
 */
export function canUseMarketing(): boolean {
  return isCookieCategoryAllowed('marketing');
}

/**
 * Save cookie preferences
 */
export function saveCookiePreferences(
  status: 'accepted' | 'rejected' | 'customized',
  preferences: CookiePreferences
): void {
  if (!isBrowser()) return;

  localStorage.setItem(COOKIE_CONSENT_KEY, status);
  localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));

  // Dispatch custom event so other parts of the app can react
  window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
    detail: { status, preferences }
  }));
}

/**
 * Clear all cookie consent data (for testing or user request)
 */
export function clearCookieConsent(): void {
  if (!isBrowser()) return;

  localStorage.removeItem(COOKIE_CONSENT_KEY);
  localStorage.removeItem(COOKIE_PREFERENCES_KEY);

  window.dispatchEvent(new CustomEvent('cookieConsentCleared'));
}

/**
 * Subscribe to cookie consent changes
 */
export function onConsentChange(
  callback: (status: string, preferences: CookiePreferences) => void
): () => void {
  if (!isBrowser()) return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ status: string; preferences: CookiePreferences }>;
    callback(customEvent.detail.status, customEvent.detail.preferences);
  };

  window.addEventListener('cookieConsentChanged', handler);

  // Return unsubscribe function
  return () => window.removeEventListener('cookieConsentChanged', handler);
}
