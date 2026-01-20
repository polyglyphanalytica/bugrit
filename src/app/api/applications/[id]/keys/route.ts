import { NextRequest, NextResponse } from 'next/server';
import {
  getApiKeysByApplication,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  getApiKey,
} from '@/lib/db/api-keys';
import { isApplicationOwner } from '@/lib/db/applications';
import { CreateApiKeyRequest } from '@/lib/types';
import { requireAuthenticatedUser } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/applications/[id]/keys - Get all API keys for an application
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;
    const { id: applicationId } = await params;

    // Check ownership
    const isOwner = await isApplicationOwner(applicationId, userId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const keys = await getApiKeysByApplication(applicationId);

    return NextResponse.json({
      keys,
      count: keys.length,
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST /api/applications/[id]/keys - Create a new API key
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;
    const { id: applicationId } = await params;

    // Check ownership
    const isOwner = await isApplicationOwner(applicationId, userId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, permissions, expiresInDays, rateLimit } = body;

    if (!name || !permissions || permissions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, permissions' },
        { status: 400 }
      );
    }

    const keyRequest: CreateApiKeyRequest = {
      name,
      applicationId,
      permissions,
      expiresInDays,
      rateLimit,
    };

    const { apiKey, fullKey } = await createApiKey(keyRequest, userId);

    return NextResponse.json(
      {
        message: 'API key created successfully',
        key: {
          ...apiKey,
          fullKey, // Only returned once at creation time
        },
        warning: 'Save this key now. It will not be shown again.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[id]/keys - Delete or revoke an API key
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;
    const { id: applicationId } = await params;

    // Check ownership
    const isOwner = await isApplicationOwner(applicationId, userId);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('keyId');
    const action = searchParams.get('action') || 'revoke';

    if (!keyId) {
      return NextResponse.json(
        { error: 'Missing keyId parameter' },
        { status: 400 }
      );
    }

    // Verify the key belongs to this application
    const key = await getApiKey(keyId);
    if (!key || key.applicationId !== applicationId) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    if (action === 'delete') {
      const deleted = await deleteApiKey(keyId);
      if (!deleted) {
        return NextResponse.json(
          { error: 'Failed to delete API key' },
          { status: 500 }
        );
      }
      return NextResponse.json({ message: 'API key deleted successfully' });
    } else {
      const revoked = await revokeApiKey(keyId);
      if (!revoked) {
        return NextResponse.json(
          { error: 'Failed to revoke API key' },
          { status: 500 }
        );
      }
      return NextResponse.json({ message: 'API key revoked successfully' });
    }
  } catch (error) {
    console.error('Error deleting/revoking API key:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
