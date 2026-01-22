/**
 * Secure API Client
 *
 * Provides authenticated API calls using Firebase ID tokens.
 * All requests include proper authentication headers.
 *
 * SECURITY: Uses Firebase ID tokens verified server-side.
 * Never sends user IDs directly - the server extracts them from verified tokens.
 */

import { User } from './types';

export interface ApiClientOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Make an authenticated API request
 * Automatically includes Firebase ID token for authentication
 */
export async function authenticatedFetch<T = unknown>(
  user: User,
  url: string,
  options: ApiClientOptions = {}
): Promise<ApiResponse<T>> {
  try {
    // Get fresh Firebase ID token
    const idToken = await user.getIdToken();

    const headers: Record<string, string> = {
      ...options.headers,
      'Authorization': `Bearer ${idToken}`,
    };

    // Add Content-Type for requests with body
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Try to parse JSON response
    let data: T | undefined;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: (data as { error?: string })?.error || `Request failed with status ${response.status}`,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const apiClient = {
  get: <T = unknown>(user: User, url: string, headers?: Record<string, string>) =>
    authenticatedFetch<T>(user, url, { method: 'GET', headers }),

  post: <T = unknown>(user: User, url: string, body?: unknown, headers?: Record<string, string>) =>
    authenticatedFetch<T>(user, url, { method: 'POST', body, headers }),

  put: <T = unknown>(user: User, url: string, body?: unknown, headers?: Record<string, string>) =>
    authenticatedFetch<T>(user, url, { method: 'PUT', body, headers }),

  delete: <T = unknown>(user: User, url: string, headers?: Record<string, string>) =>
    authenticatedFetch<T>(user, url, { method: 'DELETE', headers }),

  patch: <T = unknown>(user: User, url: string, body?: unknown, headers?: Record<string, string>) =>
    authenticatedFetch<T>(user, url, { method: 'PATCH', body, headers }),
};
