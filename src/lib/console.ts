/**
 * Environment-Aware Console Wrapper
 *
 * Drop-in replacement for direct `console.*` calls that routes all output
 * through the structured logger. Suppresses output in production.
 *
 * Usage:
 * ```ts
 * import { logger } from '@/lib/logger';
 *
 * // Preferred: use logger directly with structured context
 * logger.error('Payment failed', { error, orderId: '123' });
 *
 * // For quick migration from console.* calls:
 * import { devConsole } from '@/lib/console';
 * devConsole.error('Payment failed:', error);
 * ```
 *
 * This module exists to facilitate migration from direct console.* calls.
 * New code should always use `logger` from `@/lib/logger` directly.
 */

import { logger } from './logger';

/**
 * Format a value for log output
 */
function formatValue(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Combine variadic arguments into a single message string,
 * extracting any Error objects for structured logging.
 */
function parseArgs(args: unknown[]): { message: string; error?: unknown } {
  let error: unknown;
  const parts: string[] = [];

  for (const arg of args) {
    if (arg instanceof Error && !error) {
      error = arg;
    } else {
      parts.push(formatValue(arg));
    }
  }

  // Clean trailing colons/commas from message when error was separated
  let message = parts.join(' ').replace(/[,:]\s*$/, '');
  if (!message && error instanceof Error) {
    message = (error as Error).message;
  }

  return { message, error };
}

/**
 * Environment-aware console replacement.
 * Routes all output through the structured logger.
 */
export const devConsole = {
  log: (...args: unknown[]): void => {
    const { message } = parseArgs(args);
    logger.info(message);
  },

  info: (...args: unknown[]): void => {
    const { message } = parseArgs(args);
    logger.info(message);
  },

  warn: (...args: unknown[]): void => {
    const { message } = parseArgs(args);
    logger.warn(message);
  },

  error: (...args: unknown[]): void => {
    const { message, error } = parseArgs(args);
    logger.error(message, error ? { error } : undefined);
  },

  debug: (...args: unknown[]): void => {
    const { message } = parseArgs(args);
    logger.debug(message);
  },

  group: (...args: unknown[]): void => {
    const { message } = parseArgs(args);
    logger.debug(`[group] ${message}`);
  },

  groupEnd: (): void => {
    // No-op in structured logging
  },
};

export default devConsole;
