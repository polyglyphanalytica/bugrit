'use client';

import { isProductionHostname } from '@/lib/environment';

/**
 * Suppresses native console methods on production domains.
 *
 * This is a fallback for third-party libraries and any code that
 * accidentally uses console.log directly instead of the logger.
 *
 * For application code, always use the centralized logger:
 * import { logger } from '@/lib/logger';
 * logger.info('message', { context });
 *
 * The logger has built-in production domain suppression and provides
 * structured logging with proper context handling.
 */

// Execute immediately at module load to avoid race conditions
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (isProductionHostname(hostname)) {
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
}

export function ProductionConsoleGuard() {
  return null;
}
