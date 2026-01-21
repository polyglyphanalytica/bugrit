/**
 * V1 API Authentication
 *
 * Integrates with the existing API key system and organization context.
 * Provides rate limiting based on subscription tier.
 */

import { NextRequest } from 'next/server';
import { validateApiKey as dbValidateApiKey } from '../db/api-keys';
import { ApiKey, ApiKeyPermission } from '../types';
import { TIER_RATE_LIMITS } from '../db/v1-api';
import { TierName } from '../subscriptions/tiers';
import { ApiException, ErrorCodes } from './errors';
import { getDb } from '../firestore';

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
const isDevelopment = process.env.NODE_ENV === 'development';
const SKIP_AUTH_IN_DEV = process.env.SKIP_API_AUTH === 'true';

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
        return { orgId: ownerId, tier: 'starter' };
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
    return { orgId: ownerId, tier: 'starter' };
  }
}

async function getOrgTier(db: FirebaseFirestore.Firestore, orgId: string): Promise<TierName> {
  const orgDoc = await db.collection('organizations').doc(orgId).get();
  if (!orgDoc.exists) return 'starter';
  const orgData = orgDoc.data();
  return (orgData?.subscription?.tier as TierName) || 'starter';
}

/**
 * Validate API key and return context
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

  // Get API key from header
  const authHeader = request.headers.get('authorization');
  const xApiKey = request.headers.get('x-api-key');

  const rawKey = xApiKey || (authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader);

  if (!rawKey) {
    throw new ApiException(
      ErrorCodes.INVALID_API_KEY,
      'Missing API key. Provide via Authorization header (Bearer <key>) or x-api-key header.',
      401
    );
  }

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
