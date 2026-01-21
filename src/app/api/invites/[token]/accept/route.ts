import { NextRequest, NextResponse } from 'next/server';
import { acceptInvite } from '@/lib/organizations';
import { verifySession } from '@/lib/auth/session';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/invites/[token]/accept
 * Accept an organization invite
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifySession();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { token } = await params;

    // Get display name from Firebase Auth
    let displayName = user.email?.split('@')[0] || 'User';
    if (getApps().length > 0) {
      try {
        const firebaseUser = await getAuth().getUser(user.uid);
        displayName = firebaseUser.displayName || displayName;
      } catch {
        // Use fallback display name
      }
    }

    const result = await acceptInvite(token, user.uid, user.email || '', displayName);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      organizationId: result.organizationId,
      message: 'Successfully joined organization',
    });
  } catch (error) {
    console.error('Failed to accept invite:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}
