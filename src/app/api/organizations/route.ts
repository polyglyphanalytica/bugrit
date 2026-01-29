import { NextRequest, NextResponse } from 'next/server';
import { createOrganization, getUserOrganizations } from '@/lib/organizations';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { verifyIdToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/organizations
 * List user's organizations
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const organizations = await getUserOrganizations(userId);

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
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    // Get user email from Bearer token if available
    let userEmail = '';
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = await verifyIdToken(authHeader.substring(7));
        userEmail = decoded?.email || '';
      } catch {
        // email is optional here, userId is sufficient
      }
    }

    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    const organization = await createOrganization(userId, userEmail, name.trim());

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create organization', { error });
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
