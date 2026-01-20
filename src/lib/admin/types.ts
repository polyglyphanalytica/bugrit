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

export interface PricingConfig {
  tierName: string;
  displayName: string;
  description: string;
  isActive: boolean;

  // Stripe product/price IDs
  stripeProductId?: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;

  // Pricing
  priceMonthly: number;
  priceYearly: number;
  currency: string;

  // Limits
  limits: {
    scansPerMonth: number; // -1 = unlimited
    projects: number;
    teamMembers: number;
    historyDays: number;
    platforms: {
      web: boolean;
      mobile: boolean;
      desktop: boolean;
    };
  };

  // Features
  features: {
    aiReports: boolean;
    customRules: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    whiteLabeling: boolean;
    ssoIntegration: boolean;
  };

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
  },
} as const;

export type AdminPermission = keyof typeof ADMIN_PERMISSIONS.superadmin;

export function hasAdminPermission(
  role: 'superadmin' | 'admin',
  permission: AdminPermission
): boolean {
  return ADMIN_PERMISSIONS[role][permission];
}
