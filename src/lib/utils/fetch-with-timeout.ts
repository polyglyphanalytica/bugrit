/**
 * Fetch with Timeout Utility
 *
 * A wrapper around the native fetch API that adds configurable timeout support
 * using AbortController for proper request cancellation.
 *
 * @example
 * ```ts
 * import { fetchWithTimeout, TimeoutError } from '@/lib/utils/fetch-with-timeout';
 *
 * // Basic usage with default timeout (30s)
 * const response = await fetchWithTimeout('https://api.example.com/data');
 *
 * // Custom timeout
 * const response = await fetchWithTimeout('https://api.example.com/data', {
 *   timeout: 5000, // 5 seconds
 * });
 *
 * // With other fetch options
 * const response = await fetchWithTimeout('https://api.example.com/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ key: 'value' }),
 *   timeout: 10000, // 10 seconds
 * });
 *
 * // Handle timeout errors
 * try {
 *   const response = await fetchWithTimeout(url, { timeout: 1000 });
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     console.log('Request timed out');
 *   }
 * }
 * ```
 */

/**
 * Default timeout in milliseconds (30 seconds)
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * Custom error class for timeout errors
 */
export class TimeoutError extends Error {
  /** The URL that timed out */
  public readonly url: string;
  /** The timeout duration in milliseconds */
  public readonly timeout: number;

  constructor(url: string, timeout: number) {
    super(`Request to ${url} timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
    this.url = url;
    this.timeout = timeout;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}

/**
 * Extended fetch options with timeout support
 */
export interface FetchWithTimeoutOptions extends RequestInit {
  /** Timeout in milliseconds. Defaults to 30000 (30 seconds) */
  timeout?: number;
}

/**
 * Fetch with timeout support
 *
 * @param url - The URL to fetch
 * @param options - Fetch options including optional timeout
 * @returns Promise resolving to the Response
 * @throws TimeoutError if the request times out
 * @throws Other fetch errors (network errors, etc.)
 */
export async function fetchWithTimeout(
  url: string | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, signal: externalSignal, ...fetchOptions } = options;

  // Create an AbortController for the timeout
  const controller = new AbortController();
  const { signal: timeoutSignal } = controller;

  // If an external signal is provided, we need to handle both
  let combinedSignal: AbortSignal = timeoutSignal;

  if (externalSignal) {
    // Create a combined signal that aborts if either signal fires
    combinedSignal = combineAbortSignals(timeoutSignal, externalSignal);
  }

  // Set up the timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: combinedSignal,
    });

    return response;
  } catch (error) {
    // Check if this was a timeout abort
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        // Check if it was our timeout or an external abort
        if (timeoutSignal.aborted && !externalSignal?.aborted) {
          throw new TimeoutError(url.toString(), timeout);
        }
      }
    }

    // Re-throw other errors
    throw error;
  } finally {
    // Clean up the timeout
    clearTimeout(timeoutId);
  }
}

/**
 * Combine multiple AbortSignals into one
 * The combined signal aborts if any of the input signals abort
 */
function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }

    signal.addEventListener(
      'abort',
      () => controller.abort(signal.reason),
      { once: true }
    );
  }

  return controller.signal;
}

/**
 * Convenience function to create a fetch function with a preset timeout
 *
 * @param defaultTimeout - Default timeout for all requests
 * @returns A fetch function with the preset timeout
 *
 * @example
 * ```ts
 * const apiFetch = createFetchWithTimeout(5000);
 * const response = await apiFetch('/api/data');
 * ```
 */
export function createFetchWithTimeout(
  defaultTimeout: number
): (url: string | URL, options?: FetchWithTimeoutOptions) => Promise<Response> {
  return (url: string | URL, options: FetchWithTimeoutOptions = {}) => {
    return fetchWithTimeout(url, {
      timeout: defaultTimeout,
      ...options,
    });
  };
}

/**
 * Fetch JSON with timeout support
 * Convenience wrapper that also parses the response as JSON
 *
 * @param url - The URL to fetch
 * @param options - Fetch options including optional timeout
 * @returns Promise resolving to the parsed JSON data
 *
 * @example
 * ```ts
 * const data = await fetchJsonWithTimeout<MyDataType>('/api/data', {
 *   timeout: 5000,
 * });
 * ```
 */
export async function fetchJsonWithTimeout<T = unknown>(
  url: string | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errorBody}`);
  }

  return response.json() as Promise<T>;
}

export default fetchWithTimeout;
