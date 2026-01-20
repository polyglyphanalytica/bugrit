/**
 * API Keys Management API
 *
 * GET /api/settings/api-keys - List user's API keys
 * POST /api/settings/api-keys - Create a new API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiKeysByOwner, createApiKey } from '@/lib/db/api-keys';
import { ApiKeyPermission, API_PERMISSION_GROUPS } from '@/lib/types';
import { cookies } from 'next/headers';

// Helper to get user ID from session
async function getUserFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  // Session value contains the user ID
  return sessionCookie.value;
}

export async function GET() {
  try {
    const userId = await getUserFromSession();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const keys = await getApiKeysByOwner(userId);

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromSession();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

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
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
