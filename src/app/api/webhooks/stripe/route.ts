import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/subscriptions/stripe';
import { db } from '@/lib/firebase/admin';
import { TierName } from '@/lib/subscriptions/tiers';
import Stripe from 'stripe';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 *
 * This handler processes:
 * - Subscription checkouts (mode: subscription)
 * - Credit purchases (mode: payment with type: credit_purchase)
 * - Subscription lifecycle events
 * - Invoice events for recurring billing
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

    // Check idempotency - prevent duplicate processing
    const eventProcessed = await checkEventProcessed(event.id);
    if (eventProcessed) {
      console.log(`Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }

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

    // Mark event as processed for idempotency
    await markEventProcessed(event.id, event.type);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 500 so Stripe retries the webhook
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Check if a webhook event has already been processed (idempotency)
 */
async function checkEventProcessed(eventId: string): Promise<boolean> {
  const doc = await db.collection('stripeEvents').doc(eventId).get();
  return doc.exists;
}

/**
 * Mark a webhook event as processed (idempotency)
 */
async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  await db.collection('stripeEvents').doc(eventId).set({
    eventType,
    processedAt: new Date(),
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Determine the type of checkout
  const checkoutType = session.metadata?.type;

  if (checkoutType === 'credit_purchase') {
    await handleCreditPurchase(session);
  } else {
    // Default: subscription checkout
    await handleSubscriptionCheckout(session);
  }
}

/**
 * Handle subscription checkout completion
 */
async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.userId;
  const tier = session.metadata?.tier as TierName;
  const stripeCustomerId = session.customer as string;

  if (!userId) {
    // Critical error - throw to trigger 500 response and Stripe retry
    throw new Error(`No user ID in checkout session ${session.id}. Cannot fulfill subscription.`);
  }

  if (!tier) {
    throw new Error(`No tier in checkout session ${session.id}. Cannot fulfill subscription.`);
  }

  // Use batch write to update all collections atomically
  const batch = db.batch();

  // Update subscriptions collection (primary subscription data)
  batch.set(
    db.collection('subscriptions').doc(userId),
    {
      tier,
      status: 'active',
      stripeCustomerId,
      stripeSubscriptionId: session.subscription as string,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  // Update users collection (for quick tier lookups and auto-topup)
  batch.set(
    db.collection('users').doc(userId),
    {
      tier,
      stripeCustomerId,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  // Update billing_accounts collection (for settings page)
  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        tier,
        status: 'active',
        stripeCustomerId,
        stripeSubscriptionId: session.subscription as string,
      },
      updatedAt: new Date(),
    },
    { merge: true }
  );

  await batch.commit();

  console.log(`Subscription created for user ${userId}: ${tier}`);
}

/**
 * Handle credit package purchase completion
 */
async function handleCreditPurchase(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const credits = parseInt(session.metadata?.credits || '0', 10);
  const packageId = session.metadata?.packageId;
  const stripeCustomerId = session.customer as string;

  if (!userId) {
    throw new Error(`No user ID in credit purchase session ${session.id}. Cannot fulfill credits.`);
  }

  if (!credits || credits <= 0) {
    throw new Error(`Invalid credits amount in session ${session.id}: ${credits}`);
  }

  // Use batch write to update credits AND save customer ID for billing portal access
  const batch = db.batch();

  // Get current billing data for credit calculation
  const billingRef = db.collection('billing_accounts').doc(userId);
  const billingDoc = await billingRef.get();
  const billingData = billingDoc.exists ? billingDoc.data() : {};
  const currentPurchased = billingData?.credits?.purchased || 0;
  const currentRemaining = billingData?.credits?.remaining || 0;

  // Update billing_accounts collection
  batch.set(
    billingRef,
    {
      credits: {
        purchased: currentPurchased + credits,
        remaining: currentRemaining + credits,
        lastPurchaseAt: new Date(),
        lastPurchaseAmount: credits,
        lastPurchasePackageId: packageId,
      },
      stripeCustomerId,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  // Update users collection with stripeCustomerId for billing portal access
  if (stripeCustomerId) {
    batch.set(
      db.collection('users').doc(userId),
      {
        stripeCustomerId,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  await batch.commit();

  // Record the purchase for audit
  await db.collection('creditPurchases').add({
    userId,
    packageId,
    credits,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    stripeCustomerId,
    amount: session.amount_total,
    currency: session.currency,
    purchasedAt: new Date(),
  });

  console.log(`Credit purchase completed for user ${userId}: ${credits} credits`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  // Default to 'starter' (lowest paid tier) if metadata missing - safer than 'free' which would downgrade paid users
  const tier = (subscription.metadata.tier as TierName) || 'starter';
  if (!subscription.metadata.tier) {
    console.warn(`Subscription ${subscription.id} missing tier metadata in update, defaulting to 'starter'`);
  }

  if (!userId) {
    // Log but don't throw - subscription may have been created outside our app
    console.warn(`No user ID in subscription ${subscription.id} metadata. Skipping update.`);
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

  const status = statusMap[subscription.status] || 'active';
  const periodStart = new Date(subscription.current_period_start * 1000);
  const periodEnd = new Date(subscription.current_period_end * 1000);

  // Use batch write to update all collections
  const batch = db.batch();

  // Update subscriptions collection
  batch.set(
    db.collection('subscriptions').doc(userId),
    {
      tier,
      status,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  // Update users collection
  batch.set(
    db.collection('users').doc(userId),
    {
      tier,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  // Update billing_accounts collection
  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        tier,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      updatedAt: new Date(),
    },
    { merge: true }
  );

  await batch.commit();

  console.log(`Subscription updated for user ${userId}: ${tier} (${subscription.status})`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.warn(`No user ID in deleted subscription ${subscription.id} metadata. Skipping.`);
    return;
  }

  const now = new Date();

  // Use batch write to update all collections
  const batch = db.batch();

  // Update subscriptions collection
  batch.set(
    db.collection('subscriptions').doc(userId),
    {
      tier: 'free',
      status: 'canceled',
      canceledAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  // Update users collection
  batch.set(
    db.collection('users').doc(userId),
    {
      tier: 'free',
      updatedAt: now,
    },
    { merge: true }
  );

  // Update billing_accounts collection
  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        tier: 'free',
        status: 'canceled',
        canceledAt: now,
      },
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();

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
  const userId = doc.id;
  const now = new Date();

  // Use batch to update both collections
  const batch = db.batch();

  // Update subscriptions collection
  batch.update(doc.ref, {
    scansUsedThisMonth: 0,
    lastPaymentAt: now,
    status: 'active',
    updatedAt: now,
  });

  // Update billing_accounts collection
  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        status: 'active',
        lastPaymentAt: now,
      },
      credits: {
        used: 0, // Reset usage on new billing period
      },
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();

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
  const userId = doc.id;
  const now = new Date();

  // Use batch to update both collections
  const batch = db.batch();

  // Update subscriptions collection
  batch.update(doc.ref, {
    status: 'past_due',
    updatedAt: now,
  });

  // Update billing_accounts collection
  batch.set(
    db.collection('billing_accounts').doc(userId),
    {
      subscription: {
        status: 'past_due',
      },
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();

  console.log(`Payment failed for subscription ${subscriptionId}`);
}
