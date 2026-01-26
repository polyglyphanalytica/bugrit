import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firestore';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/settings/team - Get team/organization data for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

    const db = getDb();
    if (!db) {
      return NextResponse.json({ organization: null, members: [] });
    }

    // Find organizations the user belongs to
    const membershipsSnapshot = await db
      .collection('organizationMembers')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (membershipsSnapshot.empty) {
      return NextResponse.json({ organization: null, members: [] });
    }

    const membership = membershipsSnapshot.docs[0].data();
    const orgId = membership.organizationId;

    // Get organization details
    const orgDoc = await db.collection('organizations').doc(orgId).get();
    if (!orgDoc.exists) {
      return NextResponse.json({ organization: null, members: [] });
    }

    const orgData = orgDoc.data()!;
    const organization = {
      id: orgDoc.id,
      name: orgData.name || 'My Organization',
      ownerId: orgData.ownerId,
      tier: orgData.tier || 'free',
      memberLimit: orgData.memberLimit ?? 5,
    };

    // Get all members of this organization
    const membersSnapshot = await db
      .collection('organizationMembers')
      .where('organizationId', '==', orgId)
      .get();

    const members = membersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        email: data.email || '',
        displayName: data.displayName,
        role: data.role || 'member',
        status: data.status || 'active',
        joinedAt: data.joinedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json({ organization, members });
  } catch (error) {
    logger.error('Error fetching team data', { error });
    return NextResponse.json(
      { error: 'Failed to fetch team data' },
      { status: 500 }
    );
  }
}
