/**
 * Individual API Key Management
 *
 * GET /api/settings/api-keys/:keyId - Get API key details
 * DELETE /api/settings/api-keys/:keyId - Revoke API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiKey, revokeApiKey, deleteApiKey } from '@/lib/db/api-keys';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ keyId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { keyId } = await params;
    const apiKey = await getApiKey(keyId);

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Verify ownership
    if (apiKey.ownerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ apiKey });
  } catch (error) {
    logger.error('Error fetching API key', { error });
    return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { keyId } = await params;
    const apiKey = await getApiKey(keyId);

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Verify ownership
    if (apiKey.ownerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Revoke the key (soft delete)
    await revokeApiKey(keyId);

    return NextResponse.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    logger.error('Error revoking API key', { error });
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
