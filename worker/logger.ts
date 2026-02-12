/**
 * Worker Service Logger
 *
 * Environment-aware logging for the scan worker service.
 * - Development: Formatted console output
 * - Production: Structured JSON for Cloud Run log aggregation
 *
 * Usage:
 * ```ts
 * import { workerLogger } from './logger';
 * workerLogger.info('Scan started', requestId);
 * workerLogger.error('Scan failed', requestId, error);
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isProduction = process.env.NODE_ENV === 'production';

const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel: LogLevel = isProduction ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[minLevel];
}

function formatError(error: unknown): Record<string, unknown> | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: String(error) };
}

function log(level: LogLevel, message: string, requestId?: string, error?: unknown): void {
  if (!shouldLog(level)) return;

  if (isProduction) {
    // Structured JSON for Cloud Run log aggregation
    const entry: Record<string, unknown> = {
      severity: level.toUpperCase(),
      message: requestId ? `[${requestId}] ${message}` : message,
      timestamp: new Date().toISOString(),
      service: 'bugrit-worker',
    };
    if (requestId) entry.requestId = requestId;
    if (error) entry.error = formatError(error);

    const json = JSON.stringify(entry);
    if (level === 'error') {
      process.stderr.write(json + '\n');
    } else {
      process.stdout.write(json + '\n');
    }
  } else {
    // Readable output for development
    const prefix = requestId ? `[${requestId}] ` : '';
    const msg = `${prefix}${message}`;

    switch (level) {
      case 'error':
        if (error) { console.error(msg, error); } else { console.error(msg); }
        break;
      case 'warn':
        console.warn(msg);
        break;
      case 'debug':
        console.debug(msg);
        break;
      default:
        console.log(msg);
    }
  }
}

export const workerLogger = {
  debug: (message: string, requestId?: string): void => log('debug', message, requestId),
  info: (message: string, requestId?: string): void => log('info', message, requestId),
  warn: (message: string, requestId?: string): void => log('warn', message, requestId),
  error: (message: string, requestId?: string, error?: unknown): void => log('error', message, requestId, error),
};

export default workerLogger;
