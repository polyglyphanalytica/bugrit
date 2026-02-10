/**
 * BYOK (Bring Your Own Key) Management
 *
 * Encrypts user API keys with AES-256-GCM before storing in Firestore.
 * Keys are decrypted server-side only when making provider API calls.
 *
 * SECURITY: Strict key isolation
 * - User keys are ONLY used for that user's autofix and integration jobs.
 * - Bugrit's own internal AI features (Sensei, vibe scores, etc.) use
 *   Bugrit's platform keys via Genkit — they NEVER touch user BYOK keys.
 * - getDecryptedKey() enforces userId ownership check before decryption.
 * - No admin or system route can access user keys without the user's ID.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { db } from '@/lib/firebase/admin';
import { AIProviderID, AuthMethod, StoredAPIKey } from './types';
import { logger } from '@/lib/logger';

const ALGORITHM = 'aes-256-gcm';
const COLLECTION = 'autofixKeys';

function getEncryptionKey(): string {
  const key = process.env.ADMIN_ENCRYPTION_KEY;
  if (key) return key;
  if (process.env.NODE_ENV === 'development') return 'dev-only-key-not-for-production-32';
  throw new Error('ADMIN_ENCRYPTION_KEY must be set in production');
}

function encrypt(text: string): string {
  const encryptionKey = getEncryptionKey();
  const iv = randomBytes(16);
  const salt = randomBytes(16);
  const key = scryptSync(encryptionKey, salt, 32);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(encryptedText: string): string {
  const encryptionKey = getEncryptionKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 4) throw new Error('Invalid encrypted key format');
  const [salt, iv, authTag, encrypted] = parts.map(p => Buffer.from(p, 'hex'));
  const key = scryptSync(encryptionKey, salt, 32);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

/**
 * Store a new API key or OAuth token (encrypted)
 */
export async function storeAPIKey(
  userId: string,
  providerId: AIProviderID,
  rawKey: string,
  label: string,
  authMethod: AuthMethod = 'api_key'
): Promise<StoredAPIKey> {
  const id = `key_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const keyPrefix = rawKey.substring(0, 8) + '...';
  const encryptedKey = encrypt(rawKey);

  const stored: StoredAPIKey = {
    id,
    userId,
    providerId,
    encryptedKey,
    keyPrefix,
    label,
    authMethod,
    createdAt: new Date(),
    lastUsedAt: null,
  };

  await db.collection(COLLECTION).doc(id).set({
    ...stored,
    createdAt: stored.createdAt.toISOString(),
    lastUsedAt: null,
  });

  return stored;
}

/**
 * Retrieve and decrypt an API key/OAuth token for use.
 * Returns both the decrypted credential and its auth method.
 */
export async function getDecryptedKey(keyId: string, userId: string): Promise<{
  credential: string;
  authMethod: AuthMethod;
}> {
  const doc = await db.collection(COLLECTION).doc(keyId).get();
  if (!doc.exists) throw new Error('API key not found');

  const data = doc.data()!;
  if (data.userId !== userId) throw new Error('API key not found');

  // Update last used timestamp
  await doc.ref.update({ lastUsedAt: new Date().toISOString() });

  return {
    credential: decrypt(data.encryptedKey),
    authMethod: (data.authMethod as AuthMethod) || 'api_key',
  };
}

/**
 * List user's stored keys (without decrypted values)
 */
export async function listUserKeys(userId: string): Promise<Omit<StoredAPIKey, 'encryptedKey'>[]> {
  const snapshot = await db.collection(COLLECTION)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: data.id,
      userId: data.userId,
      providerId: data.providerId,
      keyPrefix: data.keyPrefix,
      label: data.label,
      authMethod: (data.authMethod as AuthMethod) || 'api_key',
      createdAt: new Date(data.createdAt),
      lastUsedAt: data.lastUsedAt ? new Date(data.lastUsedAt) : null,
    };
  });
}

/**
 * Delete a stored API key
 */
export async function deleteAPIKey(keyId: string, userId: string): Promise<boolean> {
  const doc = await db.collection(COLLECTION).doc(keyId).get();
  if (!doc.exists) return false;
  if (doc.data()!.userId !== userId) return false;

  await doc.ref.delete();
  return true;
}

/**
 * Validate an API key or OAuth token by making a lightweight request to the provider.
 * For OAuth tokens, validation uses Bearer auth instead of provider-specific key auth.
 */
export async function validateProviderKey(
  providerId: AIProviderID,
  rawKey: string,
  authMethod: AuthMethod = 'api_key'
): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (providerId) {
      case 'claude': {
        const headers: Record<string, string> = authMethod === 'oauth_token'
          ? { 'Authorization': `Bearer ${rawKey}`, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }
          : { 'x-api-key': rawKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
        });
        return resp.status === 401 ? { valid: false, error: 'Invalid credential' } : { valid: true };
      }
      case 'openai': {
        const resp = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${rawKey}` },
        });
        return resp.ok ? { valid: true } : { valid: false, error: 'Invalid credential' };
      }
      case 'gemini': {
        // API key: query param. OAuth token: Bearer header.
        const resp = authMethod === 'oauth_token'
          ? await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
              headers: { Authorization: `Bearer ${rawKey}` },
            })
          : await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${rawKey}`);
        return resp.ok ? { valid: true } : { valid: false, error: 'Invalid credential' };
      }
      case 'grok': {
        const resp = await fetch('https://api.x.ai/v1/models', {
          headers: { Authorization: `Bearer ${rawKey}` },
        });
        return resp.ok ? { valid: true } : { valid: false, error: 'Invalid credential' };
      }
      case 'deepseek': {
        const resp = await fetch('https://api.deepseek.com/v1/models', {
          headers: { Authorization: `Bearer ${rawKey}` },
        });
        return resp.ok ? { valid: true } : { valid: false, error: 'Invalid credential' };
      }
      case 'copilot':
        // Copilot keys/tokens are validated via GitHub token check
        return { valid: !!rawKey };
      default:
        return { valid: false, error: `Unknown provider: ${providerId}` };
    }
  } catch (error) {
    logger.error('Key validation failed', { providerId, error });
    return { valid: false, error: 'Connection failed — check your network' };
  }
}
