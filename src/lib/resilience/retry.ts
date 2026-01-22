/**
 * Retry with Exponential Backoff
 *
 * Handles transient failures by retrying with increasing delays.
 * Integrates with circuit breakers and dead letter queue.
 */

import { logger } from '@/lib/logger';

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in ms before first retry */
  initialDelay: number;
  /** Maximum delay in ms between retries */
  maxDelay: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier: number;
  /** Add random jitter to prevent thundering herd */
  jitter: boolean;
  /** Errors that should not trigger retry */
  nonRetryableErrors?: string[];
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
  retriedErrors: string[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  nonRetryableErrors: [
    'CircuitOpenError',
    'AuthenticationError',
    'ValidationError',
    'NotFoundError',
  ],
};

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Exponential backoff: delay = initialDelay * (multiplier ^ attempt)
  let delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);

  // Cap at max delay
  delay = Math.min(delay, config.maxDelay);

  // Add jitter (0-25% of delay)
  if (config.jitter) {
    const jitterAmount = delay * 0.25 * Math.random();
    delay += jitterAmount;
  }

  return Math.floor(delay);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(
  error: unknown,
  config: RetryConfig
): boolean {
  // Custom retryable check takes precedence
  if (config.isRetryable) {
    return config.isRetryable(error);
  }

  // Check non-retryable errors by name
  if (error instanceof Error) {
    if (config.nonRetryableErrors?.includes(error.name)) {
      return false;
    }

    // Network errors are typically retryable
    const retryablePatterns = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'timeout',
      'socket hang up',
      'network',
      'temporarily unavailable',
      '503',
      '502',
      '504',
      '429', // Rate limited - retry after backoff
    ];

    const errorMessage = error.message.toLowerCase();
    return retryablePatterns.some(pattern =>
      errorMessage.includes(pattern.toLowerCase())
    );
  }

  // Unknown errors - retry by default
  return true;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: { toolName?: string; scanId?: string }
): Promise<RetryResult<T>> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const retriedErrors: string[] = [];
  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      const result = await fn();

      if (attempt > 0) {
        logger.info('Retry succeeded', {
          ...context,
          attempt,
          totalAttempts: attempt + 1,
          duration: Date.now() - startTime,
        });
      }

      return {
        success: true,
        result,
        attempts: attempt + 1,
        totalDuration: Date.now() - startTime,
        retriedErrors,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retriedErrors.push(lastError.message);

      // Check if we should retry
      const shouldRetry =
        attempt < mergedConfig.maxRetries &&
        isRetryableError(error, mergedConfig);

      if (!shouldRetry) {
        logger.warn('Retry abandoned - non-retryable error or max retries', {
          ...context,
          attempt,
          maxRetries: mergedConfig.maxRetries,
          error: lastError.message,
          isRetryable: isRetryableError(error, mergedConfig),
        });
        break;
      }

      // Calculate and apply backoff delay
      const delay = calculateDelay(attempt, mergedConfig);

      logger.info('Retrying after failure', {
        ...context,
        attempt,
        maxRetries: mergedConfig.maxRetries,
        delay,
        error: lastError.message,
      });

      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: retriedErrors.length,
    totalDuration: Date.now() - startTime,
    retriedErrors,
  };
}

/**
 * Retry decorator for class methods
 */
export function Retry(config: Partial<RetryConfig> = {}) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const result = await withRetry(
        () => originalMethod.apply(this, args),
        config,
        { toolName: propertyKey }
      );

      if (!result.success) {
        throw result.error;
      }

      return result.result;
    };

    return descriptor;
  };
}

/**
 * Create a retryable version of a function
 */
export function makeRetryable<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  config: Partial<RetryConfig> = {},
  context?: { toolName?: string }
): T {
  return (async (...args: unknown[]) => {
    const result = await withRetry(
      () => fn(...args),
      config,
      context
    );

    if (!result.success) {
      throw result.error;
    }

    return result.result;
  }) as T;
}

/**
 * Retry policy presets for different scenarios
 */
export const RetryPolicies = {
  /** Quick retries for transient network issues */
  fast: {
    maxRetries: 3,
    initialDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 2,
    jitter: true,
  } as Partial<RetryConfig>,

  /** Standard retry for most operations */
  standard: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
  } as Partial<RetryConfig>,

  /** Aggressive retry for important operations */
  aggressive: {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  } as Partial<RetryConfig>,

  /** Patient retry for slow services */
  patient: {
    maxRetries: 5,
    initialDelay: 5000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    jitter: true,
  } as Partial<RetryConfig>,

  /** Single retry for semi-critical operations */
  once: {
    maxRetries: 1,
    initialDelay: 1000,
    maxDelay: 1000,
    backoffMultiplier: 1,
    jitter: false,
  } as Partial<RetryConfig>,

  /** No retry - fail fast */
  none: {
    maxRetries: 0,
    initialDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    jitter: false,
  } as Partial<RetryConfig>,
};

/**
 * Tool-specific retry configurations based on typical behavior
 */
export const ToolRetryConfigs: Record<string, Partial<RetryConfig>> = {
  // Security tools - generally reliable, quick retry
  semgrep: RetryPolicies.fast,
  trivy: RetryPolicies.fast,
  'npm-audit': RetryPolicies.fast,
  'detect-secrets': RetryPolicies.fast,

  // External services - patient retry
  'owasp-zap': RetryPolicies.patient,
  sonarqube: RetryPolicies.patient,
  'code-climate': RetryPolicies.patient,

  // Browser-based tools - aggressive retry (flaky)
  lighthouse: RetryPolicies.aggressive,
  'axe-core': RetryPolicies.aggressive,
  pa11y: RetryPolicies.aggressive,
  puppeteer: RetryPolicies.aggressive,
  backstop: RetryPolicies.aggressive,

  // Performance testing - patient (long running)
  k6: RetryPolicies.patient,
  artillery: RetryPolicies.patient,
  jmeter: RetryPolicies.patient,
  sitespeed: RetryPolicies.patient,

  // Local tools - fast
  eslint: RetryPolicies.fast,
  prettier: RetryPolicies.fast,
  stylelint: RetryPolicies.fast,
  biome: RetryPolicies.fast,
};

/**
 * Get retry config for a specific tool
 */
export function getRetryConfigForTool(toolName: string): Partial<RetryConfig> {
  const normalizedName = toolName.toLowerCase().replace(/\s+/g, '-');
  return ToolRetryConfigs[normalizedName] || RetryPolicies.standard;
}
