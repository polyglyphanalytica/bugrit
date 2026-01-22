import Stripe from 'stripe';
import { getStripeSecretKey, getAllPricingConfigs, updatePricingConfig, logAuditEvent } from './service';
import { PricingConfig } from './types';
import { db } from '@/lib/firebase/admin';

/**
 * Get a configured Stripe client using the stored API key
 */
async function getStripeClient(): Promise<Stripe | null> {
  const secretKey = await getStripeSecretKey();
  if (!secretKey) return null;

  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  });
}

/**
 * Test Stripe connection with current API key
 */
export async function testStripeConnection(): Promise<{
  success: boolean;
  mode?: 'test' | 'live';
  error?: string;
}> {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      return { success: false, error: 'Stripe API key not configured' };
    }

    // Try to list products to verify connection
    await stripe.products.list({ limit: 1 });

    // Determine if test or live mode
    const secretKey = await getStripeSecretKey();
    const mode = secretKey?.startsWith('sk_test_') ? 'test' : 'live';

    return { success: true, mode };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync local pricing tiers to Stripe products and prices
 */
export async function syncPricingToStripe(adminId: string): Promise<{
  success: boolean;
  synced: string[];
  errors: Array<{ tier: string; error: string }>;
}> {
  const stripe = await getStripeClient();
  if (!stripe) {
    return { success: false, synced: [], errors: [{ tier: 'all', error: 'Stripe not configured' }] };
  }

  const tiers = await getAllPricingConfigs();
  const synced: string[] = [];
  const errors: Array<{ tier: string; error: string }> = [];

  for (const tier of tiers) {
    // Skip free tier - no Stripe product needed
    if (tier.priceMonthly === 0) {
      synced.push(tier.tierName);
      continue;
    }

    try {
      // Build metadata with all limit fields
      const metadata: Record<string, string> = {
        tierName: tier.tierName,
        credits: String(tier.limits.credits),
        creditsRollover: String(tier.limits.creditsRollover),
        overageRate: tier.limits.overageRate != null ? String(tier.limits.overageRate) : 'null',
        maxRepoSize: String(tier.limits.maxRepoSize),
        projects: String(tier.limits.projects),
        teamMembers: String(tier.limits.teamMembers),
        historyDays: String(tier.limits.historyDays),
        apiRequestsPerMinute: String(tier.limits.apiRequestsPerMinute),
        web: String(tier.limits.platforms?.web ?? true),
        mobile: String(tier.limits.platforms?.mobile ?? false),
        desktop: String(tier.limits.platforms?.desktop ?? false),
        // Features
        aiSummary: String(tier.features?.aiSummary ?? false),
        aiExplanations: String(tier.features?.aiExplanations ?? false),
        aiFixSuggestions: String(tier.features?.aiFixSuggestions ?? false),
        aiPrioritization: String(tier.features?.aiPrioritization ?? false),
        githubIntegration: String(tier.features?.githubIntegration ?? false),
        slackIntegration: String(tier.features?.slackIntegration ?? false),
        webhooks: String(tier.features?.webhooks ?? false),
        apiAccess: String(tier.features?.apiAccess ?? false),
        prioritySupport: String(tier.features?.prioritySupport ?? false),
      };

      // Create or update Stripe product
      let product: Stripe.Product;

      if (tier.stripeProductId) {
        // Update existing product
        product = await stripe.products.update(tier.stripeProductId, {
          name: tier.displayName,
          description: tier.description,
          active: tier.isActive,
          metadata,
        });
      } else {
        // Create new product
        product = await stripe.products.create({
          name: tier.displayName,
          description: tier.description,
          active: tier.isActive,
          metadata,
        });
      }

      // Create or update monthly price
      let monthlyPriceId = tier.stripePriceIdMonthly;
      if (!monthlyPriceId && tier.priceMonthly > 0) {
        const monthlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: tier.priceMonthly * 100, // Convert to cents
          currency: tier.currency,
          recurring: { interval: 'month' },
          metadata: { tierName: tier.tierName, interval: 'month' },
        });
        monthlyPriceId = monthlyPrice.id;
      }

      // Create or update yearly price
      let yearlyPriceId = tier.stripePriceIdYearly;
      if (!yearlyPriceId && tier.priceYearly > 0) {
        const yearlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: tier.priceYearly * 100,
          currency: tier.currency,
          recurring: { interval: 'year' },
          metadata: { tierName: tier.tierName, interval: 'year' },
        });
        yearlyPriceId = yearlyPrice.id;
      }

      // Update local config with Stripe IDs
      await updatePricingConfig(
        tier.tierName,
        {
          stripeProductId: product.id,
          stripePriceIdMonthly: monthlyPriceId,
          stripePriceIdYearly: yearlyPriceId,
        },
        adminId
      );

      synced.push(tier.tierName);
    } catch (error) {
      errors.push({
        tier: tier.tierName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update last sync time
  await db.collection('platform_settings').doc('stripe').update({
    lastSyncAt: new Date(),
  });

  await logAuditEvent(adminId, 'stripe.sync', 'pricing', 'all', {
    synced,
    errors,
  });

  return {
    success: errors.length === 0,
    synced,
    errors,
  };
}

/**
 * Import products and prices from Stripe
 */
export async function importFromStripe(adminId: string): Promise<{
  success: boolean;
  imported: string[];
  errors: Array<{ productId: string; error: string }>;
}> {
  const stripe = await getStripeClient();
  if (!stripe) {
    return { success: false, imported: [], errors: [{ productId: 'all', error: 'Stripe not configured' }] };
  }

  const imported: string[] = [];
  const errors: Array<{ productId: string; error: string }> = [];

  try {
    // Get all active products
    const products = await stripe.products.list({ active: true, limit: 100 });

    for (const product of products.data) {
      try {
        // Get prices for this product
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 10,
        });

        const monthlyPrice = prices.data.find((p) => p.recurring?.interval === 'month');
        const yearlyPrice = prices.data.find((p) => p.recurring?.interval === 'year');

        // Determine tier name from metadata or product name
        const tierName = product.metadata.tierName || product.name.toLowerCase().replace(/\s+/g, '_');

        // Check if tier already exists
        const existingTier = await db
          .collection('platform_settings')
          .doc('pricing')
          .collection('tiers')
          .doc(tierName)
          .get();

        const tierConfig: Partial<PricingConfig> = {
          displayName: product.name,
          description: product.description || '',
          isActive: product.active,
          stripeProductId: product.id,
          stripePriceIdMonthly: monthlyPrice?.id,
          stripePriceIdYearly: yearlyPrice?.id,
          priceMonthly: monthlyPrice ? (monthlyPrice.unit_amount || 0) / 100 : 0,
          priceYearly: yearlyPrice ? (yearlyPrice.unit_amount || 0) / 100 : 0,
          currency: monthlyPrice?.currency || yearlyPrice?.currency || 'usd',
        };

        // Parse limits from metadata if available
        if (product.metadata.credits || product.metadata.projects) {
          tierConfig.limits = {
            credits: parseInt(product.metadata.credits) || 10,
            creditsRollover: parseInt(product.metadata.creditsRollover) || 0,
            overageRate: product.metadata.overageRate === 'null' ? null : parseFloat(product.metadata.overageRate) || null,
            maxRepoSize: parseInt(product.metadata.maxRepoSize) || 10000,
            projects: parseInt(product.metadata.projects) || -1,
            teamMembers: parseInt(product.metadata.teamMembers) || 1,
            historyDays: parseInt(product.metadata.historyDays) || 30,
            apiRequestsPerMinute: parseInt(product.metadata.apiRequestsPerMinute) || 10,
            platforms: {
              web: product.metadata.web !== 'false',
              mobile: product.metadata.mobile === 'true',
              desktop: product.metadata.desktop === 'true',
            },
          };
        }

        // Parse features from metadata if available
        if (product.metadata.aiSummary !== undefined) {
          tierConfig.features = {
            aiSummary: product.metadata.aiSummary === 'true',
            aiExplanations: product.metadata.aiExplanations === 'true',
            aiFixSuggestions: product.metadata.aiFixSuggestions === 'true',
            aiPrioritization: product.metadata.aiPrioritization === 'true',
            githubIntegration: product.metadata.githubIntegration === 'true',
            slackIntegration: product.metadata.slackIntegration === 'true',
            webhooks: product.metadata.webhooks === 'true',
            apiAccess: product.metadata.apiAccess === 'true',
            prioritySupport: product.metadata.prioritySupport === 'true',
          };
        }

        if (existingTier.exists) {
          // Update existing tier
          await updatePricingConfig(tierName, tierConfig, adminId);
        } else {
          // Create new tier with defaults
          const fullConfig: PricingConfig = {
            tierName,
            displayName: tierConfig.displayName || product.name,
            description: tierConfig.description || '',
            isActive: tierConfig.isActive ?? true,
            stripeProductId: tierConfig.stripeProductId,
            stripePriceIdMonthly: tierConfig.stripePriceIdMonthly,
            stripePriceIdYearly: tierConfig.stripePriceIdYearly,
            priceMonthly: tierConfig.priceMonthly || 0,
            priceYearly: tierConfig.priceYearly || 0,
            currency: tierConfig.currency || 'usd',
            sortOrder: 99,
            limits: tierConfig.limits || {
              scansPerMonth: -1,
              projects: -1,
              teamMembers: 5,
              historyDays: 30,
              platforms: { web: true, mobile: true, desktop: true },
            },
            features: {
              aiReports: true,
              customRules: true,
              apiAccess: true,
              prioritySupport: false,
              whiteLabeling: false,
              ssoIntegration: false,
            },
          };

          await db
            .collection('platform_settings')
            .doc('pricing')
            .collection('tiers')
            .doc(tierName)
            .set(fullConfig);
        }

        imported.push(tierName);
      } catch (error) {
        errors.push({
          productId: product.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await logAuditEvent(adminId, 'stripe.import', 'pricing', 'all', {
      imported,
      errors,
    });

    return {
      success: errors.length === 0,
      imported,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      imported: [],
      errors: [{ productId: 'all', error: error instanceof Error ? error.message : 'Unknown error' }],
    };
  }
}

/**
 * Archive a Stripe product (soft delete)
 */
export async function archiveStripeProduct(
  tierName: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const stripe = await getStripeClient();
  if (!stripe) {
    return { success: false, error: 'Stripe not configured' };
  }

  const tier = await db
    .collection('platform_settings')
    .doc('pricing')
    .collection('tiers')
    .doc(tierName)
    .get();

  if (!tier.exists) {
    return { success: false, error: 'Tier not found' };
  }

  const tierData = tier.data() as PricingConfig;

  if (!tierData.stripeProductId) {
    return { success: false, error: 'No Stripe product linked to this tier' };
  }

  try {
    await stripe.products.update(tierData.stripeProductId, { active: false });

    await logAuditEvent(adminId, 'stripe.archive', 'product', tierData.stripeProductId, {
      tierName,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get Stripe dashboard URL for a product
 */
export async function getStripeProductUrl(tierName: string): Promise<string | null> {
  const secretKey = await getStripeSecretKey();
  if (!secretKey) return null;

  const tier = await db
    .collection('platform_settings')
    .doc('pricing')
    .collection('tiers')
    .doc(tierName)
    .get();

  if (!tier.exists) return null;

  const tierData = tier.data() as PricingConfig;
  if (!tierData.stripeProductId) return null;

  const isTest = secretKey.startsWith('sk_test_');
  const baseUrl = isTest
    ? 'https://dashboard.stripe.com/test'
    : 'https://dashboard.stripe.com';

  return `${baseUrl}/products/${tierData.stripeProductId}`;
}
