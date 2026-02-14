/**
 * Platform Superadmin Types
 *
 * Superadmins have platform-wide control over:
 * - Stripe API configuration
 * - Subscription tiers and pricing
 * - Feature flags and limits
 */

export interface PlatformAdmin {
  userId: string;
  email: string;
  displayName?: string;
  role: 'superadmin' | 'admin';
  createdAt: Date;
  createdBy: string;
  lastLoginAt?: Date;
}

export interface StripeConfig {
  secretKeyEncrypted: string;
  publishableKey: string;
  webhookSecretEncrypted: string;
  isConfigured: boolean;
  lastSyncAt?: Date;
  mode: 'test' | 'live';
}

export interface PricingLimits {
  credits: number;              // Monthly credits included
  creditsRollover: number;      // Max credits that can roll over (0 = no rollover)
  overageRate: number | null;   // Cost per overage credit (null = no overage allowed)
  maxRepoSize: number;          // Max lines of code per scan
  projects: number;             // Max projects (-1 = unlimited)
  teamMembers: number;          // Max team members
  historyDays: number;          // Scan history retention in days
  apiRequestsPerMinute: number; // Rate limiting
  platforms: {
    web: boolean;
    mobile: boolean;
    desktop: boolean;
  };
}

export interface PricingFeatures {
  // Core AI Features
  aiSummary: boolean;
  aiExplanations: boolean;
  aiFixSuggestions: boolean;
  aiPrioritization: boolean;
  // Integrations
  githubIntegration: boolean;
  githubAction: boolean;
  slackIntegration: boolean;
  webhooks: boolean;
  apiAccess: boolean;
  // Vibe Coder Features
  vibeScore: boolean;
  vibeScoreBadge: boolean;
  oneClickFixes: boolean;
  aiReviewMerge: boolean;
  shipItMode: boolean;
  learningMode: boolean;
  repoHealthProfile: boolean;
  explainCodebase: boolean;
  trustBadge: boolean;
  teamDashboard: boolean;
  // Support
  prioritySupport: boolean;
}

export interface PricingConfig {
  tierName: string;
  displayName: string;
  description: string;
  isActive: boolean;
  highlighted?: boolean;        // Show as "Most Popular"

  // Stripe product/price IDs
  stripeProductId?: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;

  // Pricing
  priceMonthly: number;
  priceYearly: number;
  currency: string;

  // Limits
  limits: PricingLimits;

  // Features
  features: PricingFeatures;

  // Display order
  sortOrder: number;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  enabledForTiers: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;           // Number of credits in package
  price: number;             // Price in dollars
  currency: string;
  isActive: boolean;
  isFeatured: boolean;       // Show as "Best Value" or similar
  stripePriceId?: string;    // Stripe price ID for one-time purchase
  stripeProductId?: string;  // Stripe product ID
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutoTopupConfig {
  enabled: boolean;
  triggerThreshold: number;   // Trigger when credits fall below this
  packageId: string;          // Which package to purchase
  maxPerMonth: number;        // Maximum auto-topups per month
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
}

// Admin permissions
export const ADMIN_PERMISSIONS = {
  superadmin: {
    canManageAdmins: true,
    canManageStripeConfig: true,
    canManagePricing: true,
    canManageFeatures: true,
    canViewAuditLogs: true,
    canSyncStripe: true,
    canViewAllOrganizations: true,
    canImpersonateUsers: true,
    canManageUsers: true,
    canManageRefunds: true,
  },
  admin: {
    canManageAdmins: false,
    canManageStripeConfig: false,
    canManagePricing: false,
    canManageFeatures: true,
    canViewAuditLogs: true,
    canSyncStripe: false,
    canViewAllOrganizations: true,
    canImpersonateUsers: false,
    canManageUsers: true,
    canManageRefunds: false,
  },
} as const;

export type AdminPermission = keyof typeof ADMIN_PERMISSIONS.superadmin;

export function hasAdminPermission(
  role: 'superadmin' | 'admin',
  permission: AdminPermission
): boolean {
  return ADMIN_PERMISSIONS[role][permission];
}
