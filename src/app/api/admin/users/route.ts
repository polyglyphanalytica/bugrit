import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPermission } from '@/lib/admin/middleware';
import { db } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/users
 * List platform users with pagination and search
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminPermission(request, 'canManageUsers');
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limitParam = parseInt(searchParams.get('limit') || '25', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const tier = searchParams.get('tier') || '';
    const limit = Math.min(limitParam, 100);

    // Build query
    let query = db.collection('users').orderBy('email');

    // If searching by email prefix, use Firestore range query
    if (search) {
      const searchLower = search.toLowerCase();
      query = query
        .where('email', '>=', searchLower)
        .where('email', '<=', searchLower + '\uf8ff');
    }

    // Fetch a page of users
    const snapshot = await query.limit(limit + 1).offset(offset).get();

    const hasMore = snapshot.docs.length > limit;
    const userDocs = snapshot.docs.slice(0, limit);

    // Enrich with billing data
    const users = await Promise.all(
      userDocs.map(async (doc) => {
        const userData = doc.data();
        const userId = doc.id;

        // Get billing account
        let billing = null;
        try {
          const billingDoc = await db.collection('billing_accounts').doc(userId).get();
          if (billingDoc.exists) {
            billing = billingDoc.data();
          }
        } catch {
          // billing data optional
        }

        // Get subscription
        let subscription = null;
        try {
          const subDoc = await db.collection('subscriptions').doc(userId).get();
          if (subDoc.exists) {
            subscription = subDoc.data();
          }
        } catch {
          // subscription data optional
        }

        // Get organization memberships
        let organizations: { id: string; name: string; role: string }[] = [];
        try {
          const orgSnapshot = await db
            .collectionGroup('members')
            .where('userId', '==', userId)
            .limit(5)
            .get();

          organizations = await Promise.all(
            orgSnapshot.docs.map(async (memberDoc) => {
              const orgId = memberDoc.ref.parent.parent?.id || '';
              const memberData = memberDoc.data();
              let orgName = orgId;
              try {
                const orgDoc = await db.collection('organizations').doc(orgId).get();
                orgName = orgDoc.data()?.name || orgId;
              } catch {
                // fall back to orgId
              }
              return { id: orgId, name: orgName, role: memberData.role || 'member' };
            })
          );
        } catch {
          // org data optional
        }

        return {
          userId,
          email: userData.email || '',
          displayName: userData.displayName || null,
          photoURL: userData.photoURL || null,
          tier: subscription?.tier || userData.tier || 'free',
          subscriptionStatus: subscription?.status || billing?.subscription?.status || 'none',
          stripeCustomerId: userData.stripeCustomerId || billing?.stripe?.customerId || null,
          credits: billing?.credits || null,
          organizations,
          createdAt: userData.createdAt || null,
          updatedAt: userData.updatedAt || null,
          lastLoginAt: userData.lastLoginAt || null,
        };
      })
    );

    // Filter by tier client-side if requested (Firestore can't do compound queries easily here)
    const filtered = tier ? users.filter((u) => u.tier === tier) : users;

    return NextResponse.json({
      users: filtered,
      hasMore,
      offset,
      limit,
    });
  } catch (error) {
    logger.error('Failed to list users', { error });
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}
