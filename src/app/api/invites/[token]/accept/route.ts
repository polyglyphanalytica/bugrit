import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { acceptInvite } from '@/lib/organizations';

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/invites/[token]/accept
 * Accept an organization invite
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { token } = await params;

    // Replace with your auth method to get real user info
    const userId = 'mock-user-id';
    const userEmail = 'user@example.com';
    const displayName = 'Mock User';

    const result = await acceptInvite(token, userId, userEmail, displayName);

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
