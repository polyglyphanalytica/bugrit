/**
 * BYOK API Key Management
 *
 * POST   /api/autofix/keys — Store a new API key (encrypted)
 * GET    /api/autofix/keys — List user's stored keys (masked)
 * DELETE /api/autofix/keys?keyId=xxx — Delete a stored key
 *
 * Enterprise tier only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { storeAPIKey, listUserKeys, deleteAPIKey, validateProviderKey } from '@/lib/autofix/keys';
import { requireEnterpriseTier } from '@/lib/autofix/gate';
import { AI_PROVIDERS, AIProviderID, AuthMethod } from '@/lib/autofix/types';
import { logger } from '@/lib/logger';

const VALID_PROVIDERS = new Set(Object.keys(AI_PROVIDERS));

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const gateResult = await requireEnterpriseTier(userId);
    if (gateResult) return gateResult;

    const body = await request.json();
    const { providerId, apiKey, label, authMethod: rawAuthMethod } = body;

    if (!providerId || !apiKey || !label) {
      return NextResponse.json(
        { error: 'Missing required fields: providerId, apiKey, label' },
        { status: 400 }
      );
    }

    if (!VALID_PROVIDERS.has(providerId)) {
      return NextResponse.json({ error: `Invalid provider: ${providerId}` }, { status: 400 });
    }

    // Validate auth method (default: api_key)
    const authMethod: AuthMethod = rawAuthMethod === 'oauth_token' ? 'oauth_token' : 'api_key';

    // Validate the provider supports this auth method
    const providerConfig = AI_PROVIDERS[providerId as AIProviderID];
    if (providerConfig && !providerConfig.authMethods.includes(authMethod)) {
      return NextResponse.json(
        { error: `${providerConfig.name} does not support ${authMethod === 'oauth_token' ? 'OAuth token' : 'API key'} authentication` },
        { status: 400 }
      );
    }

    if (typeof apiKey !== 'string' || apiKey.length < 10 || apiKey.length > 2000) {
      return NextResponse.json({ error: 'Invalid credential format' }, { status: 400 });
    }

    if (typeof label !== 'string' || label.length > 100) {
      return NextResponse.json({ error: 'Label must be under 100 characters' }, { status: 400 });
    }

    // Validate the credential against the provider
    const validation = await validateProviderKey(providerId as AIProviderID, apiKey, authMethod);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid credential' },
        { status: 400 }
      );
    }

    const stored = await storeAPIKey(userId, providerId as AIProviderID, apiKey, label, authMethod);

    return NextResponse.json({
      key: {
        id: stored.id,
        providerId: stored.providerId,
        keyPrefix: stored.keyPrefix,
        label: stored.label,
        authMethod: stored.authMethod,
        createdAt: stored.createdAt,
      },
      message: authMethod === 'oauth_token' ? 'OAuth token stored successfully' : 'API key stored successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Key storage failed', { error });
    return NextResponse.json({ error: 'Failed to store API key' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const gateResult = await requireEnterpriseTier(userId);
    if (gateResult) return gateResult;

    const keys = await listUserKeys(userId);
    return NextResponse.json({ keys });
  } catch (error) {
    logger.error('Key list failed', { error });
    return NextResponse.json({ error: 'Failed to list keys' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const gateResult = await requireEnterpriseTier(userId);
    if (gateResult) return gateResult;

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('keyId');

    if (!keyId) {
      return NextResponse.json({ error: 'keyId is required' }, { status: 400 });
    }

    const deleted = await deleteAPIKey(keyId, userId);
    if (!deleted) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'API key deleted' });
  } catch (error) {
    logger.error('Key deletion failed', { error });
    return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 });
  }
}
