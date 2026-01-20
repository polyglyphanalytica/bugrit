import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  getOrganization,
  getOrganizationMembers,
  getPendingInvites,
  createInvite,
  cancelInvite,
  hasPermission,
  MemberRole,
} from '@/lib/organizations';

// Initialize Firebase Admin if not already initialized
function getFirebaseAuth() {
  if (getApps().length === 0) {
    const projectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
    } else {
      initializeApp({ projectId });
    }
  }
  return getAuth();
}

// Verify session cookie and return user ID
async function verifySessionAndGetUserId(sessionCookie: string): Promise<string | null> {
  try {
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifySessionCookie(sessionCookie);
    return decodedToken.uid;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

/**
 * GET /api/organizations/[orgId]/invites
 * List pending invites
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify session and get user ID
    const userId = await verifySessionAndGetUserId(sessionCookie);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const { orgId } = await params;

    // Verify user has permission to view invites
    const members = await getOrganizationMembers(orgId);
    const member = members.find((m) => m.userId === userId);

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    if (!hasPermission(member.role, 'canInviteMembers')) {
      return NextResponse.json({ error: 'No permission to view invites' }, { status: 403 });
    }

    const invites = await getPendingInvites(orgId);

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Failed to fetch invites:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

/**
 * POST /api/organizations/[orgId]/invites
 * Create a new invite
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify session and get user ID
    const userId = await verifySessionAndGetUserId(sessionCookie);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const { orgId } = await params;
    const { email, role = 'member' } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Verify user has permission to invite
    const members = await getOrganizationMembers(orgId);
    const member = members.find((m) => m.userId === userId);

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    if (!hasPermission(member.role, 'canInviteMembers')) {
      return NextResponse.json({ error: 'No permission to invite members' }, { status: 403 });
    }

    // Only owner can invite as admin
    const org = await getOrganization(orgId);
    if (role === 'admin' && org?.ownerId !== userId) {
      return NextResponse.json({ error: 'Only owner can invite admins' }, { status: 403 });
    }

    const result = await createInvite(orgId, email.toLowerCase(), role as MemberRole, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // In production, send email with invite link
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${result.token}`;

    return NextResponse.json({
      success: true,
      inviteUrl,
      message: `Invite sent to ${email}`,
    });
  } catch (error) {
    console.error('Failed to create invite:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

/**
 * DELETE /api/organizations/[orgId]/invites
 * Cancel a pending invite (pass token in body)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify session and get user ID
    const userId = await verifySessionAndGetUserId(sessionCookie);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const { orgId } = await params;
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 });
    }

    // Verify user has permission
    const members = await getOrganizationMembers(orgId);
    const member = members.find((m) => m.userId === userId);

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    if (!hasPermission(member.role, 'canInviteMembers')) {
      return NextResponse.json({ error: 'No permission to cancel invites' }, { status: 403 });
    }

    await cancelInvite(orgId, token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to cancel invite:', error);
    return NextResponse.json({ error: 'Failed to cancel invite' }, { status: 500 });
  }
}
