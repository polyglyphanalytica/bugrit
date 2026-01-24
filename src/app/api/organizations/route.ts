import { NextRequest, NextResponse } from 'next/server';
import { createOrganization, getUserOrganizations } from '@/lib/organizations';
import { verifySession } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

/**
 * GET /api/organizations
 * List user's organizations
 */
export async function GET() {
  try {
    const user = await verifySession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const organizations = await getUserOrganizations(user.uid);

    return NextResponse.json({ organizations });
  } catch (error) {
    logger.error('Failed to fetch organizations', { error });
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 * Create a new organization
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifySession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    const organization = await createOrganization(user.uid, user.email || '', name.trim());

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create organization', { error });
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
