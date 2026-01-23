'use client';

import { useEffect } from 'react';

const PRODUCTION_DOMAINS = ['bugrit.dev', 'bugrit.com'];

/**
 * Suppresses console output on production domains to prevent
 * information leakage that could be used for reverse engineering.
 */
export function ProductionConsoleGuard() {
  useEffect(() => {
    const hostname = window.location.hostname;
    const isProduction = PRODUCTION_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (isProduction) {
      const noop = () => {};
      console.log = noop;
      console.debug = noop;
      console.info = noop;
      console.warn = noop;
      console.error = noop;
      console.trace = noop;
      console.dir = noop;
      console.table = noop;
    }
  }, []);

  return null;
}
