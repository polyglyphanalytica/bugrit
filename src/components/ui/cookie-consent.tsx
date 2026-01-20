'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GradientButton } from './gradient-button';
import {
  CookiePreferences,
  hasConsentBeenGiven,
  getCookiePreferences,
  saveCookiePreferences,
} from '@/lib/cookies';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    // Check if consent has already been given
    if (!hasConsentBeenGiven()) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      // Load existing preferences
      setPreferences(getCookiePreferences());
    }
  }, []);

  const saveConsent = (status: 'accepted' | 'rejected' | 'customized', prefs: CookiePreferences) => {
    // Use the shared utility to save and dispatch events
    saveCookiePreferences(status, prefs);
    setIsVisible(false);
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    saveConsent('accepted', allAccepted);
  };

  const handleRejectNonEssential = () => {
    const essentialOnly: CookiePreferences = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setPreferences(essentialOnly);
    saveConsent('rejected', essentialOnly);
  };

  const handleSavePreferences = () => {
    saveConsent('customized', preferences);
  };

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return; // Cannot disable necessary cookies
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] animate-fade-in" />

      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[101] p-4 animate-slide-up">
        <div className="max-w-4xl mx-auto">
          <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden">
            {!showPreferences ? (
              /* Main Banner */
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">We value your privacy</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      We use cookies and similar technologies to enhance your experience, analyse our traffic, and for security purposes.
                      By clicking &quot;Accept All&quot;, you consent to our use of cookies as described in our{' '}
                      <Link href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                      . You can manage your preferences or withdraw consent at any time.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <GradientButton onClick={handleAcceptAll} size="sm" glow>
                        Accept All
                      </GradientButton>
                      <GradientButton onClick={handleRejectNonEssential} variant="outline" size="sm">
                        Reject Non-Essential
                      </GradientButton>
                      <button
                        onClick={() => setShowPreferences(true)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                      >
                        Manage Preferences
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Preferences Panel */
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Cookie Preferences</h3>
                  <button
                    onClick={() => setShowPreferences(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-6">
                  Choose which cookies you allow us to use. You can change your preferences at any time.
                  Note that disabling some cookies may affect your experience on our website.
                </p>

                <div className="space-y-4 mb-6">
                  {/* Necessary Cookies */}
                  <div className="flex items-start justify-between p-4 rounded-xl bg-muted/30 border border-border">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">Strictly Necessary</h4>
                        <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">Required</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Essential for the website to function. These cannot be disabled.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-12 h-7 rounded-full bg-primary flex items-center justify-end px-1 cursor-not-allowed opacity-70">
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Functional Cookies */}
                  <div className="flex items-start justify-between p-4 rounded-xl bg-muted/30 border border-border">
                    <div className="flex-1 pr-4">
                      <h4 className="font-medium mb-1">Functional</h4>
                      <p className="text-sm text-muted-foreground">
                        Enable enhanced functionality and personalisation, such as remembering your preferences.
                      </p>
                    </div>
                    <button
                      onClick={() => togglePreference('functional')}
                      className="flex-shrink-0"
                    >
                      <div className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${
                        preferences.functional ? 'bg-primary justify-end' : 'bg-muted justify-start'
                      }`}>
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform" />
                      </div>
                    </button>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-start justify-between p-4 rounded-xl bg-muted/30 border border-border">
                    <div className="flex-1 pr-4">
                      <h4 className="font-medium mb-1">Analytics</h4>
                      <p className="text-sm text-muted-foreground">
                        Help us understand how visitors interact with our website to improve our services.
                      </p>
                    </div>
                    <button
                      onClick={() => togglePreference('analytics')}
                      className="flex-shrink-0"
                    >
                      <div className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${
                        preferences.analytics ? 'bg-primary justify-end' : 'bg-muted justify-start'
                      }`}>
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform" />
                      </div>
                    </button>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-start justify-between p-4 rounded-xl bg-muted/30 border border-border">
                    <div className="flex-1 pr-4">
                      <h4 className="font-medium mb-1">Marketing</h4>
                      <p className="text-sm text-muted-foreground">
                        Used to track visitors across websites to display relevant advertisements.
                      </p>
                    </div>
                    <button
                      onClick={() => togglePreference('marketing')}
                      className="flex-shrink-0"
                    >
                      <div className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${
                        preferences.marketing ? 'bg-primary justify-end' : 'bg-muted justify-start'
                      }`}>
                        <div className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform" />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Read our Privacy Policy
                  </Link>
                  <div className="flex items-center gap-3">
                    <GradientButton onClick={handleRejectNonEssential} variant="ghost" size="sm">
                      Reject All
                    </GradientButton>
                    <GradientButton onClick={handleSavePreferences} size="sm" glow>
                      Save Preferences
                    </GradientButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
