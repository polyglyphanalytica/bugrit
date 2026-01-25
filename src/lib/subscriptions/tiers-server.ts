/**
 * Server-only tier functions
 *
 * These functions require firebase-admin and must only be used in:
 * - API routes
 * - Server components (without 'use client')
 * - Server actions
 */
import 'server-only';

import { TierDefinition, TierName, TIERS, getAllTiers } from './tiers';

// Dynamic tier loading from database
let cachedTiers: TierDefinition[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute cache

export async function loadTiersFromDatabase(): Promise<TierDefinition[]> {
  const now = Date.now();
  if (cachedTiers && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedTiers;
  }

  try {
    // Dynamically import to avoid circular deps
    const { getAllPricingConfigs, initializeDefaultPricing } = await import('@/lib/admin/service');

    let configs = await getAllPricingConfigs();

    // Initialize defaults if empty
    if (configs.length === 0) {
      await initializeDefaultPricing();
      configs = await getAllPricingConfigs();
    }

    // Convert PricingConfig to TierDefinition
    const tiers: TierDefinition[] = configs.map((config) => ({
      name: config.tierName as TierName,
      displayName: config.displayName,
      description: config.description,
      priceMonthly: config.priceMonthly,
      priceYearly: config.priceYearly,
      stripePriceIdMonthly: config.stripePriceIdMonthly,
      stripePriceIdYearly: config.stripePriceIdYearly,
      highlighted: config.highlighted,
      limits: {
        credits: config.limits.credits,
        creditsRollover: config.limits.creditsRollover,
        overageRate: config.limits.overageRate,
        maxRepoSize: config.limits.maxRepoSize,
        projects: config.limits.projects,
        teamMembers: config.limits.teamMembers,
        historyDays: config.limits.historyDays,
        apiRequestsPerMinute: config.limits.apiRequestsPerMinute,
        platforms: config.limits.platforms,
        features: {
          // Core AI Features from config
          aiSummary: config.features.aiSummary,
          aiExplanations: config.features.aiExplanations,
          aiFixSuggestions: config.features.aiFixSuggestions,
          aiPrioritization: config.features.aiPrioritization,
          // Integrations
          githubIntegration: config.features.githubIntegration,
          githubAction: config.features.githubIntegration, // Same as github integration
          slackIntegration: config.features.slackIntegration,
          webhooks: config.features.webhooks,
          apiAccess: config.features.apiAccess,
          // Vibe Coder Features - derive from tier
          vibeScore: config.features.aiSummary, // Available if AI is enabled
          vibeScoreBadge: config.features.apiAccess,
          oneClickFixes: config.features.aiFixSuggestions,
          aiReviewMerge: config.features.aiFixSuggestions,
          shipItMode: config.features.aiFixSuggestions && config.features.githubIntegration,
          learningMode: true, // Available to all
          repoHealthProfile: config.features.aiSummary,
          explainCodebase: config.features.aiExplanations,
          trustBadge: config.features.apiAccess,
          teamDashboard: config.limits.teamMembers > 1,
          // Support
          prioritySupport: config.features.prioritySupport,
        },
      },
    }));

    cachedTiers = tiers;
    cacheTimestamp = now;
    return tiers;
  } catch (error) {
    console.warn('Failed to load tiers from database, using hardcoded values:', error);
    return getAllTiers();
  }
}

export async function getTierFromDatabase(name: TierName): Promise<TierDefinition> {
  const tiers = await loadTiersFromDatabase();
  const tier = tiers.find(t => t.name === name);
  return tier || TIERS[name];
}

export function invalidateTierCache(): void {
  cachedTiers = null;
  cacheTimestamp = 0;
}
