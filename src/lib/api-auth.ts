// API Authentication middleware
// Validates API keys and manages permissions

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { store } from './store';
import { ApiKey, ApiKeyPermission } from './types';

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    // If lengths differ, compare with itself to maintain constant time
    if (bufA.length !== bufB.length) {
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Check if we're in development mode (no auth required)
const isDevelopment = process.env.NODE_ENV === 'development';
const REQUIRE_AUTH_IN_DEV = process.env.REQUIRE_API_AUTH === 'true';

export interface AuthResult {
  success: boolean;
  apiKey?: ApiKey;
  error?: string;
  statusCode?: number;
}

/**
 * Validate API key from request headers
 */
export function validateApiKey(request: NextRequest): AuthResult {
  // Skip auth in development unless explicitly required
  if (isDevelopment && !REQUIRE_AUTH_IN_DEV) {
    return { success: true };
  }

  // Get API key from header
  const apiKeyHeader = request.headers.get('x-api-key');

  if (!apiKeyHeader) {
    return {
      success: false,
      error: 'API key required. Pass key in x-api-key header.',
      statusCode: 401,
    };
  }

  // Validate key format
  if (!apiKeyHeader.startsWith('bg_')) {
    return {
      success: false,
      error: 'Invalid API key format',
      statusCode: 401,
    };
  }

  // Look up key in store
  const apiKey = store.getApiKeyByKey(apiKeyHeader);

  if (!apiKey) {
    return {
      success: false,
      error: 'Invalid API key',
      statusCode: 401,
    };
  }

  // Check if key is active
  if (apiKey.status !== 'active') {
    return {
      success: false,
      error: `API key is ${apiKey.status}`,
      statusCode: 403,
    };
  }

  // Check if key is expired
  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    return {
      success: false,
      error: 'API key has expired',
      statusCode: 403,
    };
  }

  // Increment usage counter
  store.incrementApiKeyUsage(apiKey.id);

  return {
    success: true,
    apiKey,
  };
}

/**
 * Check if API key has required permission
 */
export function hasPermission(
  apiKey: ApiKey | undefined,
  permission: ApiKeyPermission
): boolean {
  // In development without auth, allow all
  if (isDevelopment && !REQUIRE_AUTH_IN_DEV) {
    return true;
  }

  if (!apiKey) {
    return false;
  }

  return apiKey.permissions.includes(permission);
}

/**
 * Middleware to require authentication
 * Returns NextResponse if auth fails, undefined if success
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const result = validateApiKey(request);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.statusCode || 401 }
    );
  }

  return null;
}

/**
 * Middleware to require specific permission
 * Returns NextResponse if auth/permission fails, undefined if success
 */
export function requirePermission(
  request: NextRequest,
  permission: ApiKeyPermission
): NextResponse | null {
  const result = validateApiKey(request);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.statusCode || 401 }
    );
  }

  if (!hasPermission(result.apiKey, permission)) {
    return NextResponse.json(
      { error: `Permission denied. Required: ${permission}` },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Validate admin key for admin operations
 */
export function validateAdminKey(request: NextRequest): AuthResult {
  const adminKey = request.headers.get('x-admin-key');
  const expectedAdminKey = process.env.ADMIN_API_KEY;

  // In development without auth, allow admin operations
  if (isDevelopment && !REQUIRE_AUTH_IN_DEV) {
    return { success: true };
  }

  if (!expectedAdminKey) {
    return {
      success: false,
      error: 'Admin operations not configured',
      statusCode: 503,
    };
  }

  if (!adminKey) {
    return {
      success: false,
      error: 'Admin key required',
      statusCode: 401,
    };
  }

  if (!secureCompare(adminKey, expectedAdminKey)) {
    return {
      success: false,
      error: 'Invalid admin key',
      statusCode: 403,
    };
  }

  return { success: true };
}

/**
 * Middleware to require admin authentication
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const result = validateAdminKey(request);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.statusCode || 401 }
    );
  }

  return null;
}

/**
 * Create standard error response
 */
export function errorResponse(
  message: string,
  status: number = 500
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Create standard success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Get authenticated user ID from request
 * Returns the user ID from API key or session, or null if not authenticated
 */
export function getAuthenticatedUserId(request: NextRequest): string | null {
  // Try API key first
  const apiKeyResult = validateApiKey(request);
  if (apiKeyResult.success && apiKeyResult.apiKey) {
    return apiKeyResult.apiKey.ownerId;
  }

  // Try session cookie
  const sessionCookie = request.cookies.get('session');
  if (sessionCookie?.value) {
    // Session value should contain the user ID
    return sessionCookie.value;
  }

  // Try x-user-id header (for internal service calls only)
  const userIdHeader = request.headers.get('x-user-id');
  if (userIdHeader && userIdHeader !== 'demo-user') {
    return userIdHeader;
  }

  return null;
}

/**
 * Require authentication and return user ID
 * Returns NextResponse error if not authenticated, otherwise returns user ID
 */
export function requireAuthenticatedUser(request: NextRequest): NextResponse | string {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required. Provide API key via x-api-key header or login.' },
      { status: 401 }
    );
  }

  return userId;
}
