/**
 * Structured Logger Utility
 *
 * Provides consistent, structured logging across the application.
 * In development, logs to console with formatting.
 * In production, prepares for external logging service integration.
 *
 * @example
 * ```ts
 * import { logger } from '@/lib/logger';
 *
 * // Basic logging
 * logger.info('User logged in', { userId: '123' });
 * logger.warn('Rate limit approaching', { remaining: 10 });
 * logger.error('Failed to process payment', { orderId: '456', error: err });
 * logger.debug('Cache hit', { key: 'user:123' });
 *
 * // With request context
 * logger.error('API request failed', {
 *   path: '/api/billing/status',
 *   method: 'GET',
 *   userId: 'user_123',
 *   error: err,
 * });
 * ```
 */

/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Context data that can be included with log entries
 */
export interface LogContext {
  /** Request path for API logs */
  path?: string;
  /** HTTP method for API logs */
  method?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** HTTP status code */
  statusCode?: number;
  /** Error object or message */
  error?: Error | string | unknown;
  /** Any additional context data */
  [key: string]: unknown;
}

/**
 * Structured log entry format
 */
export interface LogEntry {
  /** ISO timestamp */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Additional context */
  context?: LogContext;
  /** Service name */
  service: string;
  /** Environment */
  environment: string;
}

/**
 * Configuration for the logger
 */
interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Service name for log entries */
  service: string;
  /** Whether to output as JSON (for production log aggregation) */
  jsonOutput: boolean;
}

/**
 * Log level numeric values for comparison
 */
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Console colors for different log levels (ANSI escape codes)
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
};

const RESET_COLOR = '\x1b[0m';

/**
 * Determine if we're in a browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Production domains where console output should be suppressed
 */
const PRODUCTION_DOMAINS = ['bugrit.com', 'bugrit.com'];

/**
 * Check if running on a production domain (browser only)
 * Returns true if console output should be suppressed
 */
const isProductionDomain = (): boolean => {
  if (!isBrowser) return false;
  const hostname = window.location.hostname;
  return PRODUCTION_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
};

/**
 * Determine the current environment
 */
const getEnvironment = (): string => {
  if (isBrowser) {
    return process.env.NODE_ENV || 'development';
  }
  return process.env.NODE_ENV || 'development';
};

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  minLevel: getEnvironment() === 'production' ? 'info' : 'debug',
  service: 'bugrit',
  jsonOutput: getEnvironment() === 'production' && !isBrowser,
};

/**
 * Serialize an error for logging
 */
function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    // Spread first, then explicit properties to avoid duplication warnings
    const { name: _n, message: _m, stack: _s, ...rest } = error as Error & Record<string, unknown>;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...rest,
    };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  return { value: error };
}

/**
 * Process context to handle special fields like errors
 */
function processContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;

  const processed = { ...context };

  // Serialize error if present
  if (processed.error !== undefined) {
    processed.error = serializeError(processed.error);
  }

  return processed;
}

/**
 * Format a log entry for console output (development)
 */
function formatForConsole(entry: LogEntry): string {
  const color = LOG_LEVEL_COLORS[entry.level];
  const levelStr = entry.level.toUpperCase().padEnd(5);
  const timestamp = new Date(entry.timestamp).toISOString();

  let output = `${color}[${levelStr}]${RESET_COLOR} ${timestamp} - ${entry.message}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    output += `\n${JSON.stringify(entry.context, null, 2)}`;
  }

  return output;
}

/**
 * Format a log entry for JSON output (production)
 */
function formatForJson(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Send log to external service (placeholder for future integration)
 */
async function sendToExternalService(entry: LogEntry): Promise<void> {
  // TODO: Integrate with external logging service
  // Examples: Datadog, LogDNA, Papertrail, AWS CloudWatch, etc.
  //
  // Example Datadog integration:
  // await fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'DD-API-KEY': process.env.DATADOG_API_KEY!,
  //   },
  //   body: JSON.stringify(entry),
  // });

  // For now, this is a no-op in production
  // The actual log is still written to stdout for container log collection
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  config: LoggerConfig = defaultConfig
): void {
  // Suppress all console output on production domains (browser only)
  if (isProductionDomain()) {
    return;
  }

  // Check if this log level should be output
  if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[config.minLevel]) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: processContext(context),
    service: config.service,
    environment: getEnvironment(),
  };

  // Output based on configuration
  if (config.jsonOutput) {
    // JSON output for production log aggregation
    const jsonOutput = formatForJson(entry);

    switch (level) {
      case 'error':
        console.error(jsonOutput);
        break;
      case 'warn':
        console.warn(jsonOutput);
        break;
      default:
        console.log(jsonOutput);
    }
  } else {
    // Formatted output for development
    const formattedOutput = formatForConsole(entry);

    switch (level) {
      case 'error':
        console.error(formattedOutput);
        break;
      case 'warn':
        console.warn(formattedOutput);
        break;
      case 'debug':
        console.debug(formattedOutput);
        break;
      default:
        console.log(formattedOutput);
    }
  }

  // In production, also send to external service for error and warn levels
  if (getEnvironment() === 'production' && (level === 'error' || level === 'warn')) {
    sendToExternalService(entry).catch(() => {
      // Silently fail - we don't want logging to cause errors
    });
  }
}

/**
 * Logger interface with convenience methods for each log level
 */
export const logger = {
  /**
   * Log debug message (development only by default)
   */
  debug: (message: string, context?: LogContext): void => {
    log('debug', message, context);
  },

  /**
   * Log informational message
   */
  info: (message: string, context?: LogContext): void => {
    log('info', message, context);
  },

  /**
   * Log warning message
   */
  warn: (message: string, context?: LogContext): void => {
    log('warn', message, context);
  },

  /**
   * Log error message
   */
  error: (message: string, context?: LogContext): void => {
    log('error', message, context);
  },

  /**
   * Create a child logger with default context
   * Useful for adding request-scoped context to all logs
   */
  child: (defaultContext: LogContext) => ({
    debug: (message: string, context?: LogContext): void => {
      log('debug', message, { ...defaultContext, ...context });
    },
    info: (message: string, context?: LogContext): void => {
      log('info', message, { ...defaultContext, ...context });
    },
    warn: (message: string, context?: LogContext): void => {
      log('warn', message, { ...defaultContext, ...context });
    },
    error: (message: string, context?: LogContext): void => {
      log('error', message, { ...defaultContext, ...context });
    },
  }),
};

export default logger;
