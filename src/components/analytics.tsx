'use client';

import { useEffect, useRef } from 'react';
import { useCookieConsent } from '@/hooks/use-cookie-consent';
import { devConsole } from '@/lib/console';

/**
 * Analytics component that respects cookie consent
 *
 * This component handles loading and initializing analytics scripts
 * only when the user has consented to analytics cookies.
 *
 * Add this to your root layout to enable analytics site-wide.
 */
export function Analytics() {
  const { canUseAnalytics, canUseMarketing, hasConsent } = useCookieConsent();
  const analyticsInitialized = useRef(false);
  const marketingInitialized = useRef(false);

  // Initialize analytics when consent is given
  useEffect(() => {
    if (!hasConsent) return;

    // Analytics initialization
    if (canUseAnalytics && !analyticsInitialized.current) {
      analyticsInitialized.current = true;
      initializeAnalytics();
    }

    // Marketing/advertising initialization
    if (canUseMarketing && !marketingInitialized.current) {
      marketingInitialized.current = true;
      initializeMarketing();
    }
  }, [canUseAnalytics, canUseMarketing, hasConsent]);

  // Clean up if consent is revoked (e.g., user changes preferences)
  useEffect(() => {
    if (hasConsent && !canUseAnalytics && analyticsInitialized.current) {
      // User revoked analytics consent - disable tracking
      disableAnalytics();
      analyticsInitialized.current = false;
    }

    if (hasConsent && !canUseMarketing && marketingInitialized.current) {
      // User revoked marketing consent - disable marketing scripts
      disableMarketing();
      marketingInitialized.current = false;
    }
  }, [canUseAnalytics, canUseMarketing, hasConsent]);

  return null; // This is a logic-only component
}

/**
 * Initialize analytics services
 * Replace with your actual analytics implementation
 */
function initializeAnalytics() {
  // Example: Google Analytics 4
  // Uncomment and configure with your measurement ID
  /*
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (GA_MEASUREMENT_ID) {
    // Load gtag.js
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure',
    });
  }
  */

  // Example: Simple page view tracking (placeholder)
  devConsole.log('[Analytics] Initialized - tracking enabled');

  // Track initial page view
  trackPageView(window.location.pathname);
}

/**
 * Disable analytics tracking
 */
function disableAnalytics() {
  // Example: Disable Google Analytics
  /*
  window['ga-disable-' + process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID] = true;
  */

  devConsole.log('[Analytics] Disabled - tracking stopped');
}

/**
 * Initialize marketing/advertising services
 * Replace with your actual marketing implementation
 */
function initializeMarketing() {
  // Example: Facebook Pixel, LinkedIn Insight Tag, etc.
  /*
  const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  if (FB_PIXEL_ID) {
    // Load Facebook Pixel
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', FB_PIXEL_ID);
    fbq('track', 'PageView');
  }
  */

  devConsole.log('[Marketing] Initialized - marketing tracking enabled');
}

/**
 * Disable marketing tracking
 */
function disableMarketing() {
  devConsole.log('[Marketing] Disabled - marketing tracking stopped');
}

/**
 * Track a page view (only if analytics consent given)
 */
export function trackPageView(url: string) {
  // Example: Google Analytics
  /*
  if (window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
  */

  devConsole.log('[Analytics] Page view:', url);
}

/**
 * Track a custom event (only if analytics consent given)
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  // Example: Google Analytics
  /*
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
  */

  devConsole.log('[Analytics] Event:', { action, category, label, value });
}

// Type declarations for global tracking objects
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    fbq: (...args: unknown[]) => void;
  }
}
