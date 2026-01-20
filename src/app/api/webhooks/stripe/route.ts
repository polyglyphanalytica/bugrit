import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/subscriptions/stripe';
import { db } from '@/lib/firebase/admin';
import { TierName } from '@/lib/subscriptions/tiers';
import Stripe from 'stripe';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const event = constructWebhookEvent(body, signature);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const tier = session.metadata?.tier as TierName;

  if (!userId) {
    console.error('No user ID in checkout session');
    return;
  }

  // Update subscription in Firestore
  await db.collection('subscriptions').doc(userId).set(
    {
      tier,
      status: 'active',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log(`Subscription created for user ${userId}: ${tier}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  const tier = subscription.metadata.tier as TierName;

  if (!userId) {
    console.error('No user ID in subscription metadata');
    return;
  }

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
  };

  await db.collection('subscriptions').doc(userId).set(
    {
      tier,
      status: statusMap[subscription.status] || 'active',
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log(`Subscription updated for user ${userId}: ${tier} (${subscription.status})`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No user ID in subscription metadata');
    return;
  }

  // Downgrade to free
  await db.collection('subscriptions').doc(userId).set(
    {
      tier: 'starter',
      status: 'canceled',
      canceledAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log(`Subscription canceled for user ${userId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  // Find user by subscription ID
  const snapshot = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (snapshot.empty) return;

  const doc = snapshot.docs[0];

  // Reset monthly scan count on successful payment
  await doc.ref.update({
    scansUsedThisMonth: 0,
    lastPaymentAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Payment succeeded for subscription ${subscriptionId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  // Find user by subscription ID
  const snapshot = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (snapshot.empty) return;

  const doc = snapshot.docs[0];

  // Mark as past due
  await doc.ref.update({
    status: 'past_due',
    updatedAt: new Date(),
  });

  console.log(`Payment failed for subscription ${subscriptionId}`);
}
