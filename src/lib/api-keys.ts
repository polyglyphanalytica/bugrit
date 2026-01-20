// API Key management utilities
// This module provides helper functions for API key operations
// The actual database operations are in db/api-keys.ts

import { ApiKey, ApiKeyPermission } from './types';

/**
 * Mask an API key for display (show only first and last 4 chars)
 */
export function maskApiKey(key: string): string {
  if (!key) return '****';
  if (key.length <= 12) {
    return key.substring(0, 4) + '****';
  }
  return key.substring(0, 7) + '...' + key.substring(key.length - 4);
}

/**
 * Validate API key permissions for a specific operation
 */
export function validatePermissions(
  key: ApiKey,
  requiredPermissions: ApiKeyPermission[]
): { valid: boolean; missing: ApiKeyPermission[] } {
  const missing = requiredPermissions.filter(
    (p) => !key.permissions.includes(p)
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Check if API key is within rate limit
 * Simple implementation - in production, use Redis or similar
 */
export function checkRateLimit(key: ApiKey): boolean {
  return key.usageCount < key.rateLimit;
}

/**
 * Get default permissions for different key types
 */
export function getDefaultPermissions(
  type: 'readonly' | 'execute' | 'full'
): ApiKeyPermission[] {
  switch (type) {
    case 'readonly':
      return ['scripts:read', 'executions:read', 'results:read'];
    case 'execute':
      return [
        'scripts:read',
        'scripts:submit',
        'executions:read',
        'executions:trigger',
        'results:read',
      ];
    case 'full':
      return [
        'scripts:read',
        'scripts:submit',
        'executions:read',
        'executions:trigger',
        'results:read',
      ];
    default:
      return ['scripts:read', 'executions:read'];
  }
}

/**
 * Format API key for response (includes full key only on creation)
 */
export function formatApiKeyResponse(
  key: ApiKey,
  includeFullKey: boolean = false
): Record<string, unknown> {
  return {
    id: key.id,
    key: includeFullKey ? key.key : maskApiKey(key.key),
    name: key.name,
    applicationId: key.applicationId,
    permissions: key.permissions,
    rateLimit: key.rateLimit,
    usageCount: key.usageCount,
    status: key.status,
    createdAt: key.createdAt.toISOString(),
    expiresAt: key.expiresAt?.toISOString(),
    lastUsedAt: key.lastUsedAt?.toISOString(),
  };
}

/**
 * Check if a key is expired
 */
export function isExpired(key: ApiKey): boolean {
  if (!key.expiresAt) return false;
  return key.expiresAt < new Date();
}

/**
 * Check if a key is active
 */
export function isActive(key: ApiKey): boolean {
  return key.status === 'active' && !isExpired(key);
}
