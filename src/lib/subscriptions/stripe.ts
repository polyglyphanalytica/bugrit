/**
 * Stripe Integration for Subscriptions
 *
 * Handles:
 * - Creating checkout sessions
 * - Managing subscriptions
 * - Processing webhooks
 *
 * Production safety features:
 * - Idempotency keys for all mutating operations
 * - Proper error handling
 * - Logging for debugging
 * - Consolidated secret management (database-first, env fallback)
 */

import Stripe from 'stripe';
import { TierName, TIERS, getStripePriceId } from './tiers';
import { createHash } from 'crypto';
import { isProduction } from '@/lib/environment';
import { devConsole } from '@/lib/console';

// Stripe client singleton - uses environment variable for initialization
// For operations requiring database-stored key, use getStripeClient()
let stripeClient: Stripe | null = null;

/**
 * Get the correct Stripe secret key based on environment.
 * Production (bugrit.com) uses STRIPE_SECRET_KEY (live).
 * Non-prod uses STRIPE_TEST_SECRET_KEY (sandbox), falling back to STRIPE_SECRET_KEY.
 */
export function getEnvironmentStripeSecretKey(): string | undefined {
  if (isProduction()) {
    return process.env.STRIPE_SECRET_KEY;
  }
  return process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
}

/**
 * Get the correct Stripe webhook secret based on environment.
 */
export function getEnvironmentWebhookSecret(): string | undefined {
  if (isProduction()) {
    return process.env.STRIPE_WEBHOOK_SECRET;
  }
  return process.env.STRIPE_TEST_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
}

function getDefaultStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = getEnvironmentStripeSecretKey();
    if (!secretKey) {
      throw new Error(
        'Stripe secret key is not set. ' +
        `Configure ${isProduction() ? 'STRIPE_SECRET_KEY' : 'STRIPE_TEST_SECRET_KEY'} in your environment or use the admin panel.`
      );
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
    });
  }
  return stripeClient;
}

// For backward compatibility
const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getDefaultStripeClient()[prop as keyof Stripe];
  },
});

/**
 * Get a Stripe client with a specific secret key
 * Used when the key is retrieved from database
 */
export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
  });
}

/**
 * Generate an idempotency key for Stripe operations
 * Uses a combination of operation type, user ID, and relevant params
 */
function generateIdempotencyKey(operation: string, ...args: string[]): string {
  const timestamp = Math.floor(Date.now() / 60000); // 1-minute window for retries
  const data = [operation, ...args, timestamp.toString()].join(':');
  return createHash('sha256').update(data).digest('hex').slice(0, 32);
}

export interface CreateCheckoutParams {
  userId: string;
  userEmail: string;
  tier: TierName;
  interval: 'month' | 'year';
  customerId?: string; // Reuse existing Stripe customer
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionData {
  id: string;
  status: Stripe.Subscription.Status;
  tier: TierName;
  interval: 'month' | 'year';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<{ sessionId: string; url: string }> {
  const { userId, userEmail, tier, interval, customerId, successUrl, cancelUrl } = params;

  if (tier === 'free') {
    throw new Error('Cannot create checkout for free tier');
  }

  const priceId = getStripePriceId(tier, interval);

  if (!priceId) {
    throw new Error(`No Stripe price ID configured for ${tier} ${interval} (${isProduction() ? 'live' : 'test'} mode)`);
  }

  // Generate idempotency key to prevent duplicate checkouts on retries
  const idempotencyKey = generateIdempotencyKey('checkout', userId, tier, interval);

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      // Card + Link for faster checkout (Stripe's one-click payment)
      payment_method_types: ['card', 'link'],
      // Reuse existing customer or create new one with email
      ...(customerId ? { customer: customerId } : { customer_email: userEmail }),
      client_reference_id: userId,
      allow_promotion_codes: true, // Allow customers to apply promo codes at checkout
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        tier,
        interval,
      },
      subscription_data: {
        metadata: {
          userId,
          tier,
        },
      },
    },
    { idempotencyKey }
  );

  return {
    sessionId: session.id,
    url: session.url || '',
  };
}

/**
 * Create a billing portal session for managing subscription
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscription(
  subscriptionId: string
): Promise<SubscriptionData | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return parseSubscription(subscription);
  } catch (error) {
    // Check if it's a "not found" error (expected case)
    const stripeError = error as { code?: string; type?: string };
    if (stripeError.code === 'resource_missing' || stripeError.type === 'StripeInvalidRequestError') {
      return null;
    }
    // Log unexpected errors
    devConsole.error('Failed to retrieve subscription from Stripe:', subscriptionId, error);
    return null;
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<SubscriptionData> {
  const idempotencyKey = generateIdempotencyKey('cancel', subscriptionId);
  const subscription = await stripe.subscriptions.update(
    subscriptionId,
    { cancel_at_period_end: true },
    { idempotencyKey }
  );

  return parseSubscription(subscription);
}

/**
 * Resume a cancelled subscription
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<SubscriptionData> {
  const idempotencyKey = generateIdempotencyKey('resume', subscriptionId);
  const subscription = await stripe.subscriptions.update(
    subscriptionId,
    { cancel_at_period_end: false },
    { idempotencyKey }
  );

  return parseSubscription(subscription);
}

/**
 * Change subscription tier
 */
export async function changeSubscriptionTier(
  subscriptionId: string,
  newTier: TierName,
  interval: 'month' | 'year'
): Promise<SubscriptionData> {
  if (newTier === 'free') {
    // Downgrade to free = cancel subscription
    return cancelSubscription(subscriptionId);
  }

  const priceId = getStripePriceId(newTier, interval);

  if (!priceId) {
    throw new Error(`No Stripe price ID configured for ${newTier} ${interval} (${isProduction() ? 'live' : 'test'} mode)`);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const idempotencyKey = generateIdempotencyKey('change-tier', subscriptionId, newTier, interval);
  const updatedSubscription = await stripe.subscriptions.update(
    subscriptionId,
    {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
      metadata: {
        tier: newTier,
      },
    },
    { idempotencyKey }
  );

  return parseSubscription(updatedSubscription);
}

/**
 * Parse Stripe subscription to our format
 */
function parseSubscription(subscription: Stripe.Subscription): SubscriptionData {
  // Default to 'starter' (lowest paid tier) if metadata missing
  // This is safer than assuming 'pro' which could over-provision access
  const tier = (subscription.metadata.tier as TierName) || 'starter';
  if (!subscription.metadata.tier) {
    devConsole.warn(`Subscription ${subscription.id} missing tier metadata, defaulting to 'starter'`);
  }
  const priceInterval = subscription.items.data[0]?.price.recurring?.interval;

  return {
    id: subscription.id,
    status: subscription.status,
    tier,
    interval: priceInterval === 'year' ? 'year' : 'month',
    // In Stripe v20, period info is on subscription items
    currentPeriodStart: subscription.items?.data?.[0]?.current_period_start
      ? new Date(subscription.items.data[0].current_period_start * 1000)
      : new Date(),
    currentPeriodEnd: subscription.items?.data?.[0]?.current_period_end
      ? new Date(subscription.items.data[0].current_period_end * 1000)
      : new Date(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

/**
 * Verify webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = getEnvironmentWebhookSecret();

  if (!webhookSecret) {
    throw new Error(`Stripe webhook secret not configured (${isProduction() ? 'STRIPE_WEBHOOK_SECRET' : 'STRIPE_TEST_WEBHOOK_SECRET'})`);
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Get Stripe customer by email
 */
export async function getCustomerByEmail(
  email: string
): Promise<Stripe.Customer | null> {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  return customers.data[0] || null;
}

/**
 * Create or get Stripe customer
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string
): Promise<Stripe.Customer> {
  // Check if customer exists
  const existing = await getCustomerByEmail(email);
  if (existing) {
    return existing;
  }

  // Create new customer with idempotency key to prevent duplicates
  const idempotencyKey = generateIdempotencyKey('create-customer', userId, email);
  return stripe.customers.create(
    {
      email,
      metadata: {
        userId,
      },
    },
    { idempotencyKey }
  );
}
