import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firestore';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

/**
 * PATCH /api/settings/team/members/[memberId] - Update a team member's role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;
    const { memberId } = await params;

    const { role } = await request.json();

    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    // Verify the target member exists
    const memberDoc = await db.collection('organizationMembers').doc(memberId).get();
    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const memberData = memberDoc.data()!;
    const orgId = memberData.organizationId;

    // Verify the requesting user has permission (owner or admin)
    const requesterMembership = await db
      .collection('organizationMembers')
      .where('organizationId', '==', orgId)
      .where('userId', '==', userId)
      .where('role', 'in', ['owner', 'admin'])
      .limit(1)
      .get();

    if (requesterMembership.empty) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Cannot change owner role
    if (memberData.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 });
    }

    await db.collection('organizationMembers').doc(memberId).update({ role });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error updating team member', { error });
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/team/members/[memberId] - Remove a team member
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;
    const { memberId } = await params;

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    // Verify the target member exists
    const memberDoc = await db.collection('organizationMembers').doc(memberId).get();
    if (!memberDoc.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const memberData = memberDoc.data()!;
    const orgId = memberData.organizationId;

    // Cannot remove the owner
    if (memberData.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the organization owner' }, { status: 403 });
    }

    // Verify the requesting user has permission
    const requesterMembership = await db
      .collection('organizationMembers')
      .where('organizationId', '==', orgId)
      .where('userId', '==', userId)
      .where('role', 'in', ['owner', 'admin'])
      .limit(1)
      .get();

    if (requesterMembership.empty) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    await db.collection('organizationMembers').doc(memberId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error removing team member', { error });
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
