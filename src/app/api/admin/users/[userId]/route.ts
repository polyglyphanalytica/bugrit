import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPermission } from '@/lib/admin/middleware';
import { logAuditEvent } from '@/lib/admin/service';
import { db, FieldValue } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/users/[userId]
 * Get detailed user info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await verifyAdminPermission(request, 'canManageUsers');
    if (!auth.success) return auth.response;

    const { userId } = await params;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();

    // Fetch related data in parallel
    const [billingDoc, subDoc, transactionsSnap, scansSnap] = await Promise.all([
      db.collection('billing_accounts').doc(userId).get(),
      db.collection('subscriptions').doc(userId).get(),
      db.collection('creditTransactions')
        .where('accountId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get(),
      db.collection('scans')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get(),
    ]);

    return NextResponse.json({
      user: {
        userId,
        ...userData,
      },
      billing: billingDoc.exists ? billingDoc.data() : null,
      subscription: subDoc.exists ? subDoc.data() : null,
      recentTransactions: transactionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      recentScans: scansSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (error) {
    logger.error('Failed to get user details', { error });
    return NextResponse.json({ error: 'Failed to get user details' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[userId]
 * Update user: adjust credits, change tier, disable account
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await verifyAdminPermission(request, 'canManageUsers');
    if (!auth.success) return auth.response;

    const { userId } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    switch (action) {
      case 'adjust_credits': {
        const { amount, note } = data;
        if (typeof amount !== 'number' || amount === 0) {
          return NextResponse.json({ error: 'amount must be a non-zero number' }, { status: 400 });
        }

        // Update billing account credits atomically
        const billingRef = db.collection('billing_accounts').doc(userId);
        await billingRef.set(
          { updatedAt: new Date() },
          { merge: true }
        );
        await billingRef.update({
          'credits.remaining': FieldValue.increment(amount),
          ...(amount > 0 ? { 'credits.purchased': FieldValue.increment(amount) } : {}),
        });

        // Record the transaction
        await db.collection('creditTransactions').add({
          accountId: userId,
          timestamp: new Date(),
          type: 'adjustment',
          amount,
          details: {
            note: note || `Admin adjustment by ${auth.context.admin.email}`,
          },
        });

        await logAuditEvent(
          auth.context.userId,
          'user.credits.adjust',
          'user',
          userId,
          { amount, note }
        );

        return NextResponse.json({ success: true, adjustment: amount });
      }

      case 'change_tier': {
        const { tier } = data;
        const validTiers = ['free', 'starter', 'pro', 'business', 'enterprise'];
        if (!validTiers.includes(tier)) {
          return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
        }

        const batch = db.batch();
        const now = new Date();

        batch.set(
          db.collection('users').doc(userId),
          { tier, updatedAt: now },
          { merge: true }
        );
        batch.set(
          db.collection('subscriptions').doc(userId),
          { tier, status: 'active', updatedAt: now },
          { merge: true }
        );
        batch.set(
          db.collection('billing_accounts').doc(userId),
          { subscription: { tier, status: 'active' }, updatedAt: now },
          { merge: true }
        );

        await batch.commit();

        await logAuditEvent(
          auth.context.userId,
          'user.tier.change',
          'user',
          userId,
          { tier }
        );

        return NextResponse.json({ success: true, tier });
      }

      case 'disable': {
        await db.collection('users').doc(userId).update({
          disabled: true,
          disabledAt: new Date(),
          disabledBy: auth.context.userId,
        });

        await logAuditEvent(
          auth.context.userId,
          'user.disable',
          'user',
          userId,
          { email: userDoc.data()?.email }
        );

        return NextResponse.json({ success: true });
      }

      case 'enable': {
        await db.collection('users').doc(userId).update({
          disabled: false,
          disabledAt: null,
          disabledBy: null,
        });

        await logAuditEvent(
          auth.context.userId,
          'user.enable',
          'user',
          userId,
          { email: userDoc.data()?.email }
        );

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Failed to update user', { error });
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
