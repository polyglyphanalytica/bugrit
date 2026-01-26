import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firestore';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

/**
 * POST /api/settings/team/invite - Invite a new team member
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

    const { email, role } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (role && !['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    // Find the user's organization
    const membershipsSnapshot = await db
      .collection('organizationMembers')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .where('role', 'in', ['owner', 'admin'])
      .limit(1)
      .get();

    if (membershipsSnapshot.empty) {
      return NextResponse.json(
        { error: 'You do not have permission to invite members' },
        { status: 403 }
      );
    }

    const membership = membershipsSnapshot.docs[0].data();
    const orgId = membership.organizationId;

    // Check if already a member
    const existingMember = await db
      .collection('organizationMembers')
      .where('organizationId', '==', orgId)
      .where('email', '==', email.trim().toLowerCase())
      .limit(1)
      .get();

    if (!existingMember.empty) {
      return NextResponse.json(
        { error: 'This user is already a member or has a pending invitation' },
        { status: 409 }
      );
    }

    // Create pending membership
    const memberRef = db.collection('organizationMembers').doc();
    await memberRef.set({
      organizationId: orgId,
      email: email.trim().toLowerCase(),
      userId: '', // Will be set when they accept
      role: role || 'member',
      status: 'pending',
      invitedBy: userId,
      joinedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
    });
  } catch (error) {
    logger.error('Error inviting team member', { error });
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
