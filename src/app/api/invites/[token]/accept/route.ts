import { NextRequest, NextResponse } from 'next/server';
import { acceptInvite } from '@/lib/organizations';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { getAdminAuth } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/invites/[token]/accept
 * Accept an organization invite
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { token } = await params;

    // Get display name and email from Firebase Auth
    let displayName = 'User';
    let email = '';
    const auth = getAdminAuth();
    if (auth) {
      try {
        const firebaseUser = await auth.getUser(userId);
        email = firebaseUser.email || '';
        displayName = firebaseUser.displayName || email.split('@')[0] || displayName;
      } catch {
        // Use fallback display name
      }
    }

    const result = await acceptInvite(token, userId, email, displayName);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      organizationId: result.organizationId,
      message: 'Successfully joined organization',
    });
  } catch (error) {
    logger.error('Failed to accept invite', { error });
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
