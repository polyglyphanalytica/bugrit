/**
 * V1 API Authentication
 *
 * Integrates with the existing API key system and organization context.
 * Provides rate limiting based on subscription tier.
 *
 * SECURITY: Supports two authentication methods:
 * 1. API Keys (bg_*) - For programmatic access via CLI/SDK
 * 2. Firebase ID Tokens - For browser-based authenticated requests
 *
 * NOTE: x-user-id header authentication was REMOVED due to security vulnerability.
 */

import { NextRequest } from 'next/server';
import { validateApiKey as dbValidateApiKey } from '../db/api-keys';
import { ApiKey, ApiKeyPermission } from '../types';
import { TIER_RATE_LIMITS } from '../db/v1-api';
import { TierName } from '../subscriptions/tiers';
import { ApiException, ErrorCodes } from './errors';
import { getDb } from '../firestore';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

// Extended key data with organization context
export interface ApiKeyContext {
  apiKey: ApiKey;
  organizationId: string;
  tier: TierName;
  rateLimit: number;
}

// Permission mappings for v1 API
export type V1Permission =
  | 'projects:read'
  | 'projects:write'
  | 'scans:read'
  | 'scans:write'
  | 'tests:read'
  | 'tests:write'
  | 'reports:read'
  | 'reports:write';

// Map v1 permissions to legacy permissions where applicable
const PERMISSION_ALIASES: Record<V1Permission, ApiKeyPermission[]> = {
  'projects:read': ['scripts:read', 'projects:read'],
  'projects:write': ['scripts:submit', 'projects:write'],
  'scans:read': ['executions:read', 'scans:read'],
  'scans:write': ['executions:trigger', 'scans:write'],
  'tests:read': ['results:read', 'tests:read'],
  'tests:write': ['scripts:submit', 'tests:write'],
  'reports:read': ['results:read', 'reports:read'],
  'reports:write': ['reports:write'],
};

// Rate limit tracking (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Development mode configuration
// IMPORTANT: Auth skip only works when ALL of these conditions are met:
// 1. NODE_ENV is 'development'
// 2. SKIP_API_AUTH is 'true'
// 3. We are NOT running in a production environment (VERCEL_ENV != 'production', etc.)
const isDevelopment = process.env.NODE_ENV === 'development';
const isProductionHost = process.env.VERCEL_ENV === 'production' ||
  process.env.GOOGLE_CLOUD_PROJECT !== undefined ||
  process.env.K_SERVICE !== undefined; // Cloud Run
const SKIP_AUTH_IN_DEV = process.env.SKIP_API_AUTH === 'true' && !isProductionHost;

/**
 * Get organization tier from database
 */
async function getOrganizationTier(ownerId: string): Promise<{ orgId: string; tier: TierName }> {
  const db = getDb();

  if (!db) {
    // Fallback for demo mode
    return { orgId: 'demo_org', tier: 'starter' };
  }

  try {
    // Find user's organization
    const userOrgsSnapshot = await db
      .collection('users')
      .doc(ownerId)
      .collection('organizations')
      .where('isDefault', '==', true)
      .limit(1)
      .get();

    if (userOrgsSnapshot.empty) {
      // Try to find any organization for this user
      const anyOrgSnapshot = await db
        .collection('users')
        .doc(ownerId)
        .collection('organizations')
        .limit(1)
        .get();

      if (anyOrgSnapshot.empty) {
        return { orgId: ownerId, tier: 'free' };
      }

      const orgData = anyOrgSnapshot.docs[0].data();
      return {
        orgId: orgData.organizationId,
        tier: await getOrgTier(db, orgData.organizationId),
      };
    }

    const orgData = userOrgsSnapshot.docs[0].data();
    return {
      orgId: orgData.organizationId,
      tier: await getOrgTier(db, orgData.organizationId),
    };
  } catch (error) {
    console.error('Error getting organization tier:', error);
    return { orgId: ownerId, tier: 'free' };
  }
}

async function getOrgTier(db: FirebaseFirestore.Firestore, orgId: string): Promise<TierName> {
  const orgDoc = await db.collection('organizations').doc(orgId).get();
  if (!orgDoc.exists) return 'free';
  const orgData = orgDoc.data();
  return (orgData?.subscription?.tier as TierName) || 'free';
}

/**
 * Ensure Firebase Admin is initialized for token verification
 */
function ensureFirebaseAdmin(): boolean {
  if (getApps().length === 0) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
          credential: cert(serviceAccount),
          projectId,
        });
        return true;
      } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        return false;
      }
    } else if (projectId) {
      initializeApp({ projectId });
      return true;
    }
    return false;
  }
  return true;
}

/**
 * Verify Firebase ID token and return user info
 * Used for browser-based authentication
 */
async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  if (!ensureFirebaseAdmin()) {
    return null;
  }

  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('Firebase ID token verification failed:', error);
    return null;
  }
}

/**
 * Check if a token looks like a Firebase ID token (JWT format)
 */
function isFirebaseIdToken(token: string): boolean {
  // Firebase ID tokens are JWTs with 3 dot-separated parts
  // API keys start with 'bg_'
  return token.includes('.') && token.split('.').length === 3 && !token.startsWith('bg_');
}

/**
 * Validate API key or Firebase ID token and return context
 *
 * Supports two authentication methods:
 * 1. API Key (bg_*) via x-api-key header or Authorization: Bearer bg_*
 * 2. Firebase ID Token via Authorization: Bearer <jwt>
 */
export async function validateApiKey(request: NextRequest): Promise<ApiKeyContext> {
  // Skip auth in development if configured
  if (isDevelopment && SKIP_AUTH_IN_DEV) {
    return {
      apiKey: {
        id: 'dev_key',
        key: 'bg_dev',
        name: 'Development Key',
        applicationId: 'dev_app',
        ownerId: 'dev_user',
        permissions: [
          'projects:read', 'projects:write',
          'scans:read', 'scans:write',
          'tests:read', 'tests:write',
          'reports:read', 'reports:write',
        ] as ApiKeyPermission[],
        rateLimit: 1000,
        usageCount: 0,
        status: 'active',
        createdAt: new Date(),
      },
      organizationId: 'dev_org',
      tier: 'business',
      rateLimit: TIER_RATE_LIMITS.business,
    };
  }

  // Get credentials from headers
  const authHeader = request.headers.get('authorization');
  const xApiKey = request.headers.get('x-api-key');

  // Prefer x-api-key header for API keys
  if (xApiKey) {
    return validateApiKeyCredential(xApiKey);
  }

  // Check Authorization header
  if (!authHeader) {
    throw new ApiException(
      ErrorCodes.INVALID_API_KEY,
      'Missing authentication. Provide API key via x-api-key header or Firebase ID token via Authorization: Bearer <token>.',
      401
    );
  }

  // Extract token from Bearer prefix
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) {
    throw new ApiException(
      ErrorCodes.INVALID_API_KEY,
      'Invalid Authorization header format. Use: Authorization: Bearer <token>',
      401
    );
  }

  // Check if it's an API key (starts with bg_)
  if (token.startsWith('bg_')) {
    return validateApiKeyCredential(token);
  }

  // Check if it looks like a Firebase ID token (JWT)
  if (isFirebaseIdToken(token)) {
    return validateFirebaseToken(token);
  }

  throw new ApiException(
    ErrorCodes.INVALID_API_KEY,
    'Invalid authentication token. Provide a valid API key (bg_*) or Firebase ID token.',
    401
  );
}

/**
 * Validate an API key credential
 */
async function validateApiKeyCredential(rawKey: string): Promise<ApiKeyContext> {
  // Validate key format
  if (!rawKey.startsWith('bg_')) {
    throw new ApiException(
      ErrorCodes.INVALID_API_KEY,
      'Invalid API key format. Keys must start with "bg_".',
      401
    );
  }

  // Validate against database
  const apiKey = await dbValidateApiKey(rawKey);

  if (!apiKey) {
    throw new ApiException(ErrorCodes.INVALID_API_KEY, 'Invalid or expired API key', 401);
  }

  // Get organization context and tier
  const { orgId, tier } = await getOrganizationTier(apiKey.ownerId);

  return {
    apiKey,
    organizationId: orgId,
    tier,
    rateLimit: TIER_RATE_LIMITS[tier],
  };
}

/**
 * Validate a Firebase ID token and create an API context
 * Used for browser-based authentication
 */
async function validateFirebaseToken(idToken: string): Promise<ApiKeyContext> {
  const userInfo = await verifyFirebaseIdToken(idToken);

  if (!userInfo) {
    throw new ApiException(
      ErrorCodes.INVALID_API_KEY,
      'Invalid or expired Firebase ID token. Please sign in again.',
      401
    );
  }

  // Get organization context and tier for the authenticated user
  const { orgId, tier } = await getOrganizationTier(userInfo.uid);

  // Create a virtual API key context for the authenticated user
  // This allows existing permission checks to work
  return {
    apiKey: {
      id: `firebase_${userInfo.uid}`,
      key: 'firebase_auth',
      name: 'Firebase Authentication',
      applicationId: 'web_app',
      ownerId: userInfo.uid,
      // Browser users get full permissions for their own data
      permissions: [
        'projects:read', 'projects:write',
        'scans:read', 'scans:write',
        'tests:read', 'tests:write',
        'reports:read', 'reports:write',
      ] as ApiKeyPermission[],
      rateLimit: TIER_RATE_LIMITS[tier],
      usageCount: 0,
      status: 'active',
      createdAt: new Date(),
    },
    organizationId: orgId,
    tier,
    rateLimit: TIER_RATE_LIMITS[tier],
  };
}

/**
 * Check if API key has required permission
 */
export function hasPermission(
  context: ApiKeyContext,
  permission: V1Permission
): boolean {
  const aliases = PERMISSION_ALIASES[permission];
  return aliases.some((p) => context.apiKey.permissions.includes(p));
}

/**
 * Require a specific permission
 */
export function requirePermission(
  context: ApiKeyContext,
  permission: V1Permission
): void {
  if (!hasPermission(context, permission)) {
    throw new ApiException(
      ErrorCodes.FORBIDDEN,
      `Missing required permission: ${permission}`,
      403
    );
  }
}

/**
 * Check and update rate limit
 */
export function checkRateLimit(
  context: ApiKeyContext
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = context.apiKey.id;
  const limit = rateLimitStore.get(key);
  const rateLimit = context.rateLimit;
  const window = 60000; // 1 minute

  if (!limit || now > limit.resetAt) {
    // Reset or initialize
    const resetAt = now + window;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: rateLimit - 1, resetAt };
  }

  if (limit.count >= rateLimit) {
    return { allowed: false, remaining: 0, resetAt: limit.resetAt };
  }

  limit.count++;
  return { allowed: true, remaining: rateLimit - limit.count, resetAt: limit.resetAt };
}

/**
 * Full authentication middleware
 */
export async function authenticateRequest(
  request: NextRequest,
  requiredPermission?: V1Permission
): Promise<ApiKeyContext> {
  // Validate API key and get context
  const context = await validateApiKey(request);

  // Check permission if required
  if (requiredPermission) {
    requirePermission(context, requiredPermission);
  }

  // Check rate limit
  const rateLimit = checkRateLimit(context);
  if (!rateLimit.allowed) {
    throw new ApiException(
      ErrorCodes.RATE_LIMITED,
      `Rate limit exceeded. Limit: ${context.rateLimit} requests per minute (${context.tier} tier)`,
      429,
      {
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        tier: context.tier,
        limit: context.rateLimit,
      }
    );
  }

  return context;
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(context: ApiKeyContext): Record<string, string> {
  const limit = rateLimitStore.get(context.apiKey.id);
  const remaining = limit ? context.rateLimit - limit.count : context.rateLimit;
  const resetAt = limit?.resetAt || Date.now() + 60000;

  return {
    'X-RateLimit-Limit': String(context.rateLimit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
    'X-RateLimit-Tier': context.tier,
  };
}

/**
 * Verify organization access to a project
 */
export async function verifyProjectAccess(
  context: ApiKeyContext,
  projectId: string
): Promise<boolean> {
  const db = getDb();

  if (!db) {
    // In demo mode, allow all
    return true;
  }

  try {
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) return false;
    const projectData = projectDoc.data();
    return projectData?.organizationId === context.organizationId;
  } catch (error) {
    console.error('Error verifying project access:', error);
    return false;
  }
}
