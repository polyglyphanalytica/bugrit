/**
 * API Keys Management API
 *
 * GET /api/settings/api-keys - List user's API keys
 * POST /api/settings/api-keys - Create a new API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiKeysByOwner, createApiKey } from '@/lib/db/api-keys';
import { ApiKeyPermission, API_PERMISSION_GROUPS } from '@/lib/types';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const keys = await getApiKeysByOwner(userId);

    return NextResponse.json({ keys });
  } catch (error) {
    logger.error('Error fetching API keys', { error });
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const body = await request.json();

    // Validate name
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate permissions
    const validPermissions: ApiKeyPermission[] = [
      'scripts:submit',
      'scripts:read',
      'executions:trigger',
      'executions:read',
      'results:read',
      'projects:read',
      'projects:write',
      'scans:read',
      'scans:write',
      'tests:read',
      'tests:write',
      'reports:read',
      'reports:write',
    ];

    const permissions: ApiKeyPermission[] = body.permissions || API_PERMISSION_GROUPS.execute;
    const invalidPermissions = permissions.filter((p: string) => !validPermissions.includes(p as ApiKeyPermission));

    if (invalidPermissions.length > 0) {
      return NextResponse.json({
        error: `Invalid permissions: ${invalidPermissions.join(', ')}`,
        validPermissions,
      }, { status: 400 });
    }

    // Create the API key
    const { apiKey, fullKey } = await createApiKey(
      {
        name: body.name,
        applicationId: body.applicationId || 'default',
        permissions: permissions as ApiKeyPermission[],
        expiresInDays: body.expiresInDays,
        rateLimit: body.rateLimit,
      },
      userId
    );

    // Return the full key only once
    return NextResponse.json({
      apiKey,
      fullKey,
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating API key', { error });
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
