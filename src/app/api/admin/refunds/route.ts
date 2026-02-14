import { NextRequest, NextResponse } from 'next/server';
import { verifySuperadmin } from '@/lib/admin/middleware';
import { logAuditEvent } from '@/lib/admin/service';
import { db, FieldValue } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';
import { getEnvironmentStripeSecretKey } from '@/lib/subscriptions/stripe';

function getStripe(): Stripe {
  const key = getEnvironmentStripeSecretKey();
  if (!key) throw new Error('Stripe secret key not configured');
  return new Stripe(key, { apiVersion: '2026-01-28.clover' });
}

/**
 * GET /api/admin/refunds
 * List refunds from Firestore and optionally from Stripe
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySuperadmin(request);
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '25', 10);
    const source = searchParams.get('source') || 'all'; // 'firestore' | 'stripe' | 'all'
    const limit = Math.min(limitParam, 100);

    const results: {
      refunds: any[];
      disputes: any[];
    } = { refunds: [], disputes: [] };

    // Get refunds from Firestore (webhook-recorded)
    if (source === 'firestore' || source === 'all') {
      const refundsSnap = await db
        .collection('refunds')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      results.refunds = refundsSnap.docs.map((doc) => ({
        id: doc.id,
        source: 'firestore',
        ...doc.data(),
      }));
    }

    // Get refunds from Stripe directly
    if (source === 'stripe' || source === 'all') {
      try {
        const stripe = getStripe();
        const stripeRefunds = await stripe.refunds.list({ limit });

        const stripeResults = stripeRefunds.data.map((r) => ({
          id: r.id,
          source: 'stripe',
          amount: r.amount,
          currency: r.currency,
          status: r.status,
          reason: r.reason,
          stripeChargeId: r.charge as string,
          stripePaymentIntentId: r.payment_intent as string,
          createdAt: new Date(r.created * 1000),
        }));

        // Merge, deduplicating by stripeChargeId
        const existingChargeIds = new Set(results.refunds.map((r) => r.stripeChargeId));
        for (const sr of stripeResults) {
          if (!existingChargeIds.has(sr.stripeChargeId)) {
            results.refunds.push(sr);
          }
        }
      } catch (stripeErr) {
        logger.warn('Failed to fetch Stripe refunds (Stripe may not be configured)', { error: stripeErr });
      }
    }

    // Get disputes
    const disputesSnap = await db
      .collection('disputes')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    results.disputes = disputesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort refunds by date descending
    results.refunds.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json(results);
  } catch (error) {
    logger.error('Failed to list refunds', { error });
    return NextResponse.json({ error: 'Failed to list refunds' }, { status: 500 });
  }
}

/**
 * POST /api/admin/refunds
 * Issue a new refund via Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySuperadmin(request);
    if (!auth.success) return auth.response;

    const body = await request.json();
    const { paymentIntentId, chargeId, amount, reason, userId, note } = body;

    if (!paymentIntentId && !chargeId) {
      return NextResponse.json(
        { error: 'Either paymentIntentId or chargeId is required' },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Build refund params
    const refundParams: Stripe.RefundCreateParams = {
      reason: reason === 'duplicate' ? 'duplicate' : reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer',
    };

    if (paymentIntentId) {
      refundParams.payment_intent = paymentIntentId;
    } else if (chargeId) {
      refundParams.charge = chargeId;
    }

    // If amount specified, do partial refund (amount in cents)
    if (amount && amount > 0) {
      refundParams.amount = Math.round(amount * 100);
    }

    // Process the refund through Stripe
    const refund = await stripe.refunds.create(refundParams);

    // Record in Firestore
    const refundRecord = {
      stripeRefundId: refund.id,
      stripeChargeId: refund.charge as string,
      stripePaymentIntentId: paymentIntentId || null,
      amountRefunded: refund.amount,
      currency: refund.currency,
      reason: refund.reason || reason || 'requested_by_customer',
      status: refund.status === 'succeeded' ? 'full' : 'pending',
      note: note || '',
      issuedBy: auth.context.admin.email,
      issuedByUserId: auth.context.userId,
      userId: userId || null,
      createdAt: new Date(),
    };

    await db.collection('refunds').add(refundRecord);

    // If this was a credit purchase refund and we have a userId, deduct the credits
    if (userId && note?.toLowerCase().includes('credit')) {
      try {
        const billingRef = db.collection('billing_accounts').doc(userId);
        const billingDoc = await billingRef.get();
        if (billingDoc.exists) {
          const creditAmount = Math.round(refund.amount / 100); // rough estimate
          await billingRef.update({
            'credits.remaining': FieldValue.increment(-creditAmount),
            'credits.purchased': FieldValue.increment(-creditAmount),
          });
        }
      } catch {
        // Credit adjustment is best-effort
      }
    }

    // Create notification for user if we know who they are
    if (userId) {
      await db.collection('notifications').add({
        userId,
        type: 'refund_processed',
        title: 'Refund Processed',
        message: `A refund of $${(refund.amount / 100).toFixed(2)} has been processed by support.`,
        read: false,
        createdAt: new Date(),
      });
    }

    await logAuditEvent(
      auth.context.userId,
      'refund.create',
      'refund',
      refund.id,
      {
        amount: refund.amount,
        currency: refund.currency,
        reason,
        userId,
        paymentIntentId,
        chargeId,
      }
    );

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process refund';
    logger.error('Failed to process refund', { error });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
