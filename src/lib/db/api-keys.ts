// Firestore operations for API Keys

import {
  getDb,
  COLLECTIONS,
  toDate,
  toTimestamp,
  generateId,
} from '../firestore';
import { ApiKey, ApiKeyPermission, CreateApiKeyRequest } from '../types';
import { store } from '../store';
import crypto from 'crypto';
import { devConsole } from '@/lib/console';

const API_KEYS_COLLECTION = 'apiKeys';

/**
 * Generate a secure API key
 */
function generateApiKey(): string {
  const prefix = 'bg';
  const randomBytes = crypto.randomBytes(24);
  const key = randomBytes.toString('base64url');
  return `${prefix}_${key}`;
}

/**
 * Hash an API key for storage
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Get all API keys for an application (masks the actual key)
 */
export async function getApiKeysByApplication(applicationId: string): Promise<ApiKey[]> {
  const db = getDb();

  if (!db) {
    return store.getAllApiKeys().filter((k) => k.applicationId === applicationId);
  }

  try {
    const snapshot = await db
      .collection(API_KEYS_COLLECTION)
      .where('applicationId', '==', applicationId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        key: maskApiKey(data.keyPrefix), // Only show prefix
        name: data.name,
        applicationId: data.applicationId,
        ownerId: data.ownerId,
        permissions: data.permissions || [],
        rateLimit: data.rateLimit || 1000,
        usageCount: data.usageCount || 0,
        status: data.status,
        createdAt: toDate(data.createdAt),
        expiresAt: data.expiresAt ? toDate(data.expiresAt) : undefined,
        lastUsedAt: data.lastUsedAt ? toDate(data.lastUsedAt) : undefined,
      } as ApiKey;
    });
  } catch (error) {
    devConsole.error('Error getting API keys:', error);
    return [];
  }
}

/**
 * Get all API keys for a user (masks the actual key)
 */
export async function getApiKeysByOwner(ownerId: string): Promise<ApiKey[]> {
  const db = getDb();

  if (!db) {
    return store.getAllApiKeys().filter((k) => k.ownerId === ownerId);
  }

  try {
    const snapshot = await db
      .collection(API_KEYS_COLLECTION)
      .where('ownerId', '==', ownerId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        key: maskApiKey(data.keyPrefix),
        name: data.name,
        applicationId: data.applicationId,
        ownerId: data.ownerId,
        permissions: data.permissions || [],
        rateLimit: data.rateLimit || 1000,
        usageCount: data.usageCount || 0,
        status: data.status,
        createdAt: toDate(data.createdAt),
        expiresAt: data.expiresAt ? toDate(data.expiresAt) : undefined,
        lastUsedAt: data.lastUsedAt ? toDate(data.lastUsedAt) : undefined,
      } as ApiKey;
    });
  } catch (error) {
    devConsole.error('Error getting API keys:', error);
    return [];
  }
}

/**
 * Create a new API key
 * Returns the full key only once - it cannot be retrieved later
 */
export async function createApiKey(
  request: CreateApiKeyRequest,
  ownerId: string
): Promise<{ apiKey: ApiKey; fullKey: string }> {
  const db = getDb();
  const id = generateId('ak');
  const now = new Date();
  const fullKey = generateApiKey();
  const keyHash = hashApiKey(fullKey);
  const keyPrefix = fullKey.substring(0, 10); // Store prefix for display

  const expiresAt = request.expiresInDays
    ? new Date(now.getTime() + request.expiresInDays * 24 * 60 * 60 * 1000)
    : undefined;

  const newKey: ApiKey = {
    id,
    key: maskApiKey(keyPrefix),
    name: request.name,
    applicationId: request.applicationId,
    ownerId,
    permissions: request.permissions,
    rateLimit: request.rateLimit || 1000,
    usageCount: 0,
    status: 'active',
    createdAt: now,
    expiresAt,
  };

  if (!db) {
    // In demo mode without Firestore, just return the key
    // The store.createApiKey signature doesn't match the new types
    devConsole.warn('Firestore not configured - API key not persisted');
    return { apiKey: newKey, fullKey };
  }

  try {
    await db.collection(API_KEYS_COLLECTION).doc(id).set({
      name: newKey.name,
      applicationId: newKey.applicationId,
      ownerId: newKey.ownerId,
      keyHash, // Store hash, not the actual key
      keyPrefix, // Store prefix for display
      permissions: newKey.permissions,
      rateLimit: newKey.rateLimit,
      usageCount: 0,
      status: 'active',
      createdAt: toTimestamp(now),
      expiresAt: expiresAt ? toTimestamp(expiresAt) : null,
      lastUsedAt: null,
    });

    return { apiKey: newKey, fullKey };
  } catch (error) {
    devConsole.error('Error creating API key:', error);
    throw new Error('Failed to create API key');
  }
}

/**
 * Validate an API key and return the key record if valid
 */
export async function validateApiKey(key: string): Promise<ApiKey | null> {
  const db = getDb();

  if (!db) {
    // In-memory validation
    return store.getApiKeyByKey(key) || null;
  }

  const keyHash = hashApiKey(key);

  try {
    const snapshot = await db
      .collection(API_KEYS_COLLECTION)
      .where('keyHash', '==', keyHash)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check expiration
    if (data.expiresAt && toDate(data.expiresAt) < new Date()) {
      // Key has expired - update status
      await doc.ref.update({ status: 'expired' });
      return null;
    }

    // Update usage count and last used
    await doc.ref.update({
      usageCount: (data.usageCount || 0) + 1,
      lastUsedAt: toTimestamp(new Date()),
    });

    return {
      id: doc.id,
      key: maskApiKey(data.keyPrefix),
      name: data.name,
      applicationId: data.applicationId,
      ownerId: data.ownerId,
      permissions: data.permissions || [],
      rateLimit: data.rateLimit || 1000,
      usageCount: (data.usageCount || 0) + 1,
      status: data.status,
      createdAt: toDate(data.createdAt),
      expiresAt: data.expiresAt ? toDate(data.expiresAt) : undefined,
      lastUsedAt: new Date(),
    } as ApiKey;
  } catch (error) {
    devConsole.error('Error validating API key:', error);
    return null;
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(id: string): Promise<boolean> {
  const db = getDb();

  if (!db) {
    const key = store.revokeApiKey(id);
    return !!key;
  }

  try {
    await db.collection(API_KEYS_COLLECTION).doc(id).update({
      status: 'revoked',
    });
    return true;
  } catch (error) {
    devConsole.error('Error revoking API key:', error);
    return false;
  }
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(id: string): Promise<boolean> {
  const db = getDb();

  if (!db) {
    return false;
  }

  try {
    await db.collection(API_KEYS_COLLECTION).doc(id).delete();
    return true;
  } catch (error) {
    devConsole.error('Error deleting API key:', error);
    return false;
  }
}

/**
 * Get an API key by ID (for owner verification)
 */
export async function getApiKey(id: string): Promise<ApiKey | null> {
  const db = getDb();

  if (!db) {
    return store.getApiKey(id) || null;
  }

  try {
    const doc = await db.collection(API_KEYS_COLLECTION).doc(id).get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      key: maskApiKey(data.keyPrefix),
      name: data.name,
      applicationId: data.applicationId,
      ownerId: data.ownerId,
      permissions: data.permissions || [],
      rateLimit: data.rateLimit || 1000,
      usageCount: data.usageCount || 0,
      status: data.status,
      createdAt: toDate(data.createdAt),
      expiresAt: data.expiresAt ? toDate(data.expiresAt) : undefined,
      lastUsedAt: data.lastUsedAt ? toDate(data.lastUsedAt) : undefined,
    } as ApiKey;
  } catch (error) {
    devConsole.error('Error getting API key:', error);
    return null;
  }
}

/**
 * Check if API key has required permissions
 */
export function hasPermissions(
  apiKey: ApiKey,
  required: ApiKeyPermission[]
): boolean {
  return required.every((p) => apiKey.permissions.includes(p));
}

/**
 * Check rate limit
 */
export async function checkRateLimit(apiKey: ApiKey): Promise<boolean> {
  // Simple check - in production use Redis or similar
  // This just checks if under the total limit
  return apiKey.usageCount < apiKey.rateLimit;
}

/**
 * Mask API key for display
 */
function maskApiKey(keyPrefix: string): string {
  if (!keyPrefix) return '****';
  return `${keyPrefix}...`;
}

/**
 * Get all API keys (admin only)
 */
export async function getAllApiKeys(): Promise<ApiKey[]> {
  const db = getDb();

  if (!db) {
    return store.getAllApiKeys();
  }

  try {
    const snapshot = await db
      .collection(API_KEYS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        key: maskApiKey(data.keyPrefix),
        name: data.name,
        applicationId: data.applicationId,
        ownerId: data.ownerId,
        permissions: data.permissions || [],
        rateLimit: data.rateLimit || 1000,
        usageCount: data.usageCount || 0,
        status: data.status,
        createdAt: toDate(data.createdAt),
        expiresAt: data.expiresAt ? toDate(data.expiresAt) : undefined,
        lastUsedAt: data.lastUsedAt ? toDate(data.lastUsedAt) : undefined,
      } as ApiKey;
    });
  } catch (error) {
    devConsole.error('Error getting all API keys:', error);
    return [];
  }
}
