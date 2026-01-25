import { db } from '@/lib/firebase/admin';
import { getAdminAuth, isAdminReady } from '@/lib/firebase-admin';
import {
  PlatformAdmin,
  StripeConfig,
  PricingConfig,
  FeatureFlag,
  AuditLog,
  CreditPackage,
  hasAdminPermission as hasAdminPermissionFn,
  AdminPermission,
} from './types';

// Re-export hasAdminPermission for use by middleware
export const hasAdminPermission = hasAdminPermissionFn;
import { DEFAULT_SUPERADMIN_EMAIL, isProtectedSuperadmin } from './constants';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Encryption helpers for sensitive data
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): string {
  const key = process.env.ADMIN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'CRITICAL: ADMIN_ENCRYPTION_KEY environment variable is not set. ' +
      'This is required for encrypting sensitive data like Stripe API keys. ' +
      'Generate a secure 32-character key and set it in your environment.'
    );
  }
  if (key.length < 32) {
    throw new Error(
      'CRITICAL: ADMIN_ENCRYPTION_KEY must be at least 32 characters long for AES-256 encryption.'
    );
  }
  return key;
}

function encrypt(text: string): string {
  const encryptionKey = getEncryptionKey();
  const iv = randomBytes(16);
  const salt = randomBytes(16);
  const key = scryptSync(encryptionKey, salt, 32);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(encryptedText: string): string {
  const encryptionKey = getEncryptionKey();
  const parts = encryptedText.split(':');

  // Support both old format (iv:authTag:encrypted) and new format (salt:iv:authTag:encrypted)
  let salt: Buffer;
  let iv: Buffer;
  let authTag: Buffer;
  let encrypted: Buffer;

  if (parts.length === 3) {
    // Legacy format without random salt - use static salt for backward compatibility
    salt = Buffer.from('salt');
    [iv, authTag, encrypted] = [
      Buffer.from(parts[0], 'hex'),
      Buffer.from(parts[1], 'hex'),
      Buffer.from(parts[2], 'hex'),
    ];
  } else if (parts.length === 4) {
    // New format with random salt
    [salt, iv, authTag, encrypted] = parts.map(p => Buffer.from(p, 'hex'));
  } else {
    throw new Error('Invalid encrypted data format');
  }

  const key = scryptSync(encryptionKey, salt, 32);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// ==================== ADMIN MANAGEMENT ====================

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const doc = await db.collection('platform_admins').doc(userId).get();
  return doc.exists;
}

export async function isPlatformAdminByEmail(email: string): Promise<boolean> {
  // Check if it's the hardcoded superadmin
  if (email.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  const snapshot = await db
    .collection('platform_admins')
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();
  return !snapshot.empty;
}

export async function getPlatformAdminByEmail(email: string): Promise<PlatformAdmin | null> {
  // Return hardcoded superadmin for the default email
  if (email.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase()) {
    const snapshot = await db
      .collection('platform_admins')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return snapshot.docs[0].data() as PlatformAdmin;
    }

    // Return a virtual superadmin record if not in database yet
    return {
      userId: 'default-superadmin',
      email: DEFAULT_SUPERADMIN_EMAIL,
      displayName: 'Platform Owner',
      role: 'superadmin',
      createdAt: new Date(),
      createdBy: 'system',
    };
  }

  const snapshot = await db
    .collection('platform_admins')
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as PlatformAdmin;
}

export async function getPlatformAdmin(userId: string): Promise<PlatformAdmin | null> {
  // First check by userId in database
  const doc = await db.collection('platform_admins').doc(userId).get();
  if (doc.exists) {
    return doc.data() as PlatformAdmin;
  }

  // If not found, check if this user's email is the SUPERADMIN_EMAIL
  // This handles the case where the superadmin hasn't been added to the database yet
  const auth = getAdminAuth();
  if (auth && DEFAULT_SUPERADMIN_EMAIL) {
    try {
      const userRecord = await auth.getUser(userId);

      if (userRecord.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase()) {
        // Auto-create the superadmin record in the database
        const admin: PlatformAdmin = {
          userId,
          email: userRecord.email,
          displayName: userRecord.displayName || 'Platform Owner',
          role: 'superadmin',
          createdAt: new Date(),
          createdBy: 'system',
        };

        // Save to database for future lookups
        await db.collection('platform_admins').doc(userId).set(admin);

        return admin;
      }
    } catch (error) {
      console.error('Error checking user email for admin:', error);
    }
  }

  return null;
}

export async function getAllPlatformAdmins(): Promise<PlatformAdmin[]> {
  const snapshot = await db.collection('platform_admins').get();
  return snapshot.docs.map((doc) => doc.data() as PlatformAdmin);
}

export async function addPlatformAdmin(
  userId: string,
  email: string,
  role: 'superadmin' | 'admin',
  createdBy: string,
  displayName?: string
): Promise<PlatformAdmin> {
  const admin: PlatformAdmin = {
    userId,
    email,
    displayName,
    role,
    createdAt: new Date(),
    createdBy,
  };

  await db.collection('platform_admins').doc(userId).set(admin);
  await logAuditEvent(createdBy, 'admin.create', 'platform_admin', userId, { email, role });

  return admin;
}

export async function removePlatformAdmin(userId: string, removedBy: string): Promise<void> {
  const admin = await getPlatformAdmin(userId);
  if (!admin) return;

  // Prevent removing protected superadmins
  if (isProtectedSuperadmin(admin.email)) {
    throw new Error('Cannot remove the platform owner');
  }

  // Prevent removing the last superadmin
  if (admin.role === 'superadmin') {
    const allAdmins = await getAllPlatformAdmins();
    const superadminCount = allAdmins.filter((a) => a.role === 'superadmin').length;
    if (superadminCount <= 1) {
      throw new Error('Cannot remove the last superadmin');
    }
  }

  await db.collection('platform_admins').doc(userId).delete();
  await logAuditEvent(removedBy, 'admin.delete', 'platform_admin', userId, { email: admin.email });
}

export async function updateAdminLastLogin(userId: string): Promise<void> {
  await db.collection('platform_admins').doc(userId).update({
    lastLoginAt: new Date(),
  });
}

// ==================== STRIPE CONFIG ====================

export async function getStripeConfig(): Promise<StripeConfig | null> {
  const doc = await db.collection('platform_settings').doc('stripe').get();
  if (!doc.exists) return null;

  const data = doc.data() as StripeConfig;
  return {
    ...data,
    // Don't decrypt here - keep encrypted for security
    secretKeyEncrypted: data.secretKeyEncrypted ? '••••••••' : '',
    webhookSecretEncrypted: data.webhookSecretEncrypted ? '••••••••' : '',
  };
}

export async function getStripeSecretKey(): Promise<string | null> {
  const doc = await db.collection('platform_settings').doc('stripe').get();
  if (!doc.exists) return null;

  const data = doc.data() as StripeConfig;
  if (!data.secretKeyEncrypted) return null;

  try {
    return decrypt(data.secretKeyEncrypted);
  } catch {
    return null;
  }
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const doc = await db.collection('platform_settings').doc('stripe').get();
  if (!doc.exists) return null;

  const data = doc.data() as StripeConfig;
  if (!data.webhookSecretEncrypted) return null;

  try {
    return decrypt(data.webhookSecretEncrypted);
  } catch {
    return null;
  }
}

export async function updateStripeConfig(
  config: {
    secretKey?: string;
    publishableKey?: string;
    webhookSecret?: string;
    mode?: 'test' | 'live';
  },
  updatedBy: string
): Promise<void> {
  const updates: Partial<StripeConfig> = {};

  if (config.secretKey) {
    updates.secretKeyEncrypted = encrypt(config.secretKey);
  }
  if (config.publishableKey) {
    updates.publishableKey = config.publishableKey;
  }
  if (config.webhookSecret) {
    updates.webhookSecretEncrypted = encrypt(config.webhookSecret);
  }
  if (config.mode) {
    updates.mode = config.mode;
  }

  updates.isConfigured = !!(config.secretKey || config.publishableKey);

  await db.collection('platform_settings').doc('stripe').set(updates, { merge: true });
  await logAuditEvent(updatedBy, 'stripe.config.update', 'stripe_config', 'stripe', {
    hasSecretKey: !!config.secretKey,
    hasPublishableKey: !!config.publishableKey,
    hasWebhookSecret: !!config.webhookSecret,
    mode: config.mode,
  });
}

// ==================== PRICING CONFIG ====================

export async function getAllPricingConfigs(): Promise<PricingConfig[]> {
  const snapshot = await db
    .collection('platform_settings')
    .doc('pricing')
    .collection('tiers')
    .orderBy('sortOrder')
    .get();

  return snapshot.docs.map((doc) => ({ tierName: doc.id, ...doc.data() } as PricingConfig));
}

export async function getPricingConfig(tierName: string): Promise<PricingConfig | null> {
  const doc = await db
    .collection('platform_settings')
    .doc('pricing')
    .collection('tiers')
    .doc(tierName)
    .get();

  if (!doc.exists) return null;
  return { tierName: doc.id, ...doc.data() } as PricingConfig;
}

export async function updatePricingConfig(
  tierName: string,
  config: Partial<PricingConfig>,
  updatedBy: string
): Promise<void> {
  const { tierName: _, ...updateData } = config;

  await db
    .collection('platform_settings')
    .doc('pricing')
    .collection('tiers')
    .doc(tierName)
    .set(updateData, { merge: true });

  await logAuditEvent(updatedBy, 'pricing.update', 'pricing_tier', tierName, config);
}

export async function createPricingTier(
  config: PricingConfig,
  createdBy: string
): Promise<void> {
  const { tierName, ...data } = config;

  await db
    .collection('platform_settings')
    .doc('pricing')
    .collection('tiers')
    .doc(tierName)
    .set(data);

  await logAuditEvent(createdBy, 'pricing.create', 'pricing_tier', tierName, config as unknown as Record<string, unknown>);
}

export async function deletePricingTier(tierName: string, deletedBy: string): Promise<void> {
  // Don't allow deleting the free tier
  if (tierName === 'starter') {
    throw new Error('Cannot delete the free tier');
  }

  await db
    .collection('platform_settings')
    .doc('pricing')
    .collection('tiers')
    .doc(tierName)
    .delete();

  await logAuditEvent(deletedBy, 'pricing.delete', 'pricing_tier', tierName, {});
}

// ==================== FEATURE FLAGS ====================

export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const snapshot = await db.collection('feature_flags').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FeatureFlag));
}

export async function getFeatureFlag(flagId: string): Promise<FeatureFlag | null> {
  const doc = await db.collection('feature_flags').doc(flagId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as FeatureFlag;
}

export async function updateFeatureFlag(
  flagId: string,
  updates: Partial<FeatureFlag>,
  updatedBy: string
): Promise<void> {
  const { id: _, ...updateData } = updates;
  updateData.updatedAt = new Date();

  await db.collection('feature_flags').doc(flagId).set(updateData, { merge: true });
  await logAuditEvent(updatedBy, 'feature.update', 'feature_flag', flagId, updates);
}

export async function createFeatureFlag(
  flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<FeatureFlag> {
  const now = new Date();
  const ref = db.collection('feature_flags').doc();

  const newFlag: FeatureFlag = {
    ...flag,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(newFlag);
  await logAuditEvent(createdBy, 'feature.create', 'feature_flag', ref.id, flag);

  return newFlag;
}

export async function deleteFeatureFlag(flagId: string, deletedBy: string): Promise<void> {
  await db.collection('feature_flags').doc(flagId).delete();
  await logAuditEvent(deletedBy, 'feature.delete', 'feature_flag', flagId, {});
}

// ==================== AUDIT LOGGING ====================

export async function logAuditEvent(
  adminId: string,
  action: string,
  resource: string,
  resourceId: string,
  details: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  const admin = await getPlatformAdmin(adminId);

  const log: Omit<AuditLog, 'id'> = {
    adminId,
    adminEmail: admin?.email || 'unknown',
    action,
    resource,
    resourceId,
    details,
    timestamp: new Date(),
    ipAddress,
  };

  await db.collection('audit_logs').add(log);
}

export async function getAuditLogs(
  options: {
    limit?: number;
    adminId?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<AuditLog[]> {
  let query = db.collection('audit_logs').orderBy('timestamp', 'desc');

  if (options.adminId) {
    query = query.where('adminId', '==', options.adminId);
  }
  if (options.resource) {
    query = query.where('resource', '==', options.resource);
  }
  if (options.startDate) {
    query = query.where('timestamp', '>=', options.startDate);
  }
  if (options.endDate) {
    query = query.where('timestamp', '<=', options.endDate);
  }

  const snapshot = await query.limit(options.limit || 100).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AuditLog));
}

// ==================== INITIALIZATION ====================

/**
 * Initialize the default superadmin if not exists
 */
export async function initializeDefaultSuperadmin(userId: string): Promise<void> {
  // Check if already exists
  const existing = await db
    .collection('platform_admins')
    .where('email', '==', DEFAULT_SUPERADMIN_EMAIL.toLowerCase())
    .limit(1)
    .get();

  if (!existing.empty) return;

  // Create the default superadmin
  const admin: PlatformAdmin = {
    userId,
    email: DEFAULT_SUPERADMIN_EMAIL,
    displayName: 'Platform Owner',
    role: 'superadmin',
    createdAt: new Date(),
    createdBy: 'system',
  };

  await db.collection('platform_admins').doc(userId).set(admin);
}

/**
 * Check if user is a superadmin (bypasses all subscription limits)
 */
export async function isSuperadmin(emailOrUserId: string): Promise<boolean> {
  // Check by email first
  if (emailOrUserId.includes('@')) {
    if (emailOrUserId.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase()) {
      return true;
    }
    const admin = await getPlatformAdminByEmail(emailOrUserId);
    return admin?.role === 'superadmin';
  }

  // Check by userId
  const admin = await getPlatformAdmin(emailOrUserId);
  return admin?.role === 'superadmin';
}

// ==================== CREDIT PACKAGES ====================

export async function getAllCreditPackages(): Promise<CreditPackage[]> {
  const snapshot = await db
    .collection('platform_settings')
    .doc('credit_packages')
    .collection('packages')
    .orderBy('sortOrder')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CreditPackage));
}

export async function getCreditPackage(packageId: string): Promise<CreditPackage | null> {
  const doc = await db
    .collection('platform_settings')
    .doc('credit_packages')
    .collection('packages')
    .doc(packageId)
    .get();

  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as CreditPackage;
}

export async function createCreditPackage(
  pkg: Omit<CreditPackage, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<CreditPackage> {
  const now = new Date();
  const ref = db
    .collection('platform_settings')
    .doc('credit_packages')
    .collection('packages')
    .doc();

  const newPackage: CreditPackage = {
    ...pkg,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(newPackage);
  await logAuditEvent(createdBy, 'credit_package.create', 'credit_package', ref.id, pkg);

  return newPackage;
}

export async function updateCreditPackage(
  packageId: string,
  updates: Partial<CreditPackage>,
  updatedBy: string
): Promise<void> {
  const { id: _, createdAt: __, ...updateData } = updates;
  (updateData as { updatedAt: Date }).updatedAt = new Date();

  await db
    .collection('platform_settings')
    .doc('credit_packages')
    .collection('packages')
    .doc(packageId)
    .set(updateData, { merge: true });

  await logAuditEvent(updatedBy, 'credit_package.update', 'credit_package', packageId, updates);
}

export async function deleteCreditPackage(packageId: string, deletedBy: string): Promise<void> {
  await db
    .collection('platform_settings')
    .doc('credit_packages')
    .collection('packages')
    .doc(packageId)
    .delete();

  await logAuditEvent(deletedBy, 'credit_package.delete', 'credit_package', packageId, {});
}

export async function initializeDefaultCreditPackages(): Promise<void> {
  const existing = await getAllCreditPackages();
  if (existing.length > 0) return;

  const defaultPackages: Omit<CreditPackage, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Starter Pack',
      description: '25 credits to get you started',
      credits: 25,
      price: 5,
      currency: 'usd',
      isActive: true,
      isFeatured: false,
      sortOrder: 0,
    },
    {
      name: 'Pro Pack',
      description: '100 credits - Save 20%',
      credits: 100,
      price: 16,
      currency: 'usd',
      isActive: true,
      isFeatured: true,
      sortOrder: 1,
    },
    {
      name: 'Power Pack',
      description: '500 credits - Save 40%',
      credits: 500,
      price: 60,
      currency: 'usd',
      isActive: true,
      isFeatured: false,
      sortOrder: 2,
    },
    {
      name: 'Enterprise Pack',
      description: '2000 credits - Best value',
      credits: 2000,
      price: 200,
      currency: 'usd',
      isActive: true,
      isFeatured: false,
      sortOrder: 3,
    },
  ];

  for (const pkg of defaultPackages) {
    await createCreditPackage(pkg, 'system');
  }
}

export async function initializeDefaultPricing(): Promise<void> {
  const existing = await getAllPricingConfigs();
  if (existing.length > 0) return;

  const defaultTiers: PricingConfig[] = [
    {
      tierName: 'free',
      displayName: 'Free',
      description: 'Try it out',
      isActive: true,
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'usd',
      sortOrder: 0,
      limits: {
        credits: 10,
        creditsRollover: 0,
        overageRate: null,
        maxRepoSize: 10_000,
        projects: 1,
        teamMembers: 1,
        historyDays: 7,
        apiRequestsPerMinute: 5,
        platforms: { web: true, mobile: false, desktop: false },
      },
      features: {
        aiSummary: false,
        aiExplanations: false,
        aiFixSuggestions: false,
        aiPrioritization: false,
        githubIntegration: false,
        githubAction: false,
        slackIntegration: false,
        webhooks: false,
        apiAccess: false,
        vibeScore: true,
        vibeScoreBadge: false,
        oneClickFixes: false,
        aiReviewMerge: false,
        shipItMode: false,
        learningMode: true,
        repoHealthProfile: false,
        explainCodebase: false,
        trustBadge: true,
        teamDashboard: false,
        prioritySupport: false,
      },
    },
    {
      tierName: 'starter',
      displayName: 'Starter',
      description: 'For side projects',
      isActive: true,
      priceMonthly: 15,
      priceYearly: 150,
      currency: 'usd',
      sortOrder: 1,
      limits: {
        credits: 50,
        creditsRollover: 0,
        overageRate: 0.35,
        maxRepoSize: 50_000,
        projects: 3,
        teamMembers: 1,
        historyDays: 14,
        apiRequestsPerMinute: 10,
        platforms: { web: true, mobile: false, desktop: false },
      },
      features: {
        aiSummary: true,
        aiExplanations: false,
        aiFixSuggestions: false,
        aiPrioritization: false,
        githubIntegration: false,
        githubAction: false,
        slackIntegration: false,
        webhooks: false,
        apiAccess: false,
        vibeScore: true,
        vibeScoreBadge: true,
        oneClickFixes: false,
        aiReviewMerge: false,
        shipItMode: true,
        learningMode: true,
        repoHealthProfile: true,
        explainCodebase: false,
        trustBadge: true,
        teamDashboard: false,
        prioritySupport: false,
      },
    },
    {
      tierName: 'pro',
      displayName: 'Pro',
      description: 'For serious builders',
      isActive: true,
      highlighted: true,
      priceMonthly: 39,
      priceYearly: 390,
      currency: 'usd',
      sortOrder: 2,
      limits: {
        credits: 200,
        creditsRollover: 100,
        overageRate: 0.25,
        maxRepoSize: 150_000,
        projects: 10,
        teamMembers: 3,
        historyDays: 30,
        apiRequestsPerMinute: 60,
        platforms: { web: true, mobile: true, desktop: false },
      },
      features: {
        aiSummary: true,
        aiExplanations: true,
        aiFixSuggestions: false,
        aiPrioritization: true,
        githubIntegration: true,
        githubAction: true,
        slackIntegration: false,
        webhooks: false,
        apiAccess: false,
        vibeScore: true,
        vibeScoreBadge: true,
        oneClickFixes: false,
        aiReviewMerge: false,
        shipItMode: true,
        learningMode: true,
        repoHealthProfile: true,
        explainCodebase: false,
        trustBadge: true,
        teamDashboard: false,
        prioritySupport: false,
      },
    },
    {
      tierName: 'business',
      displayName: 'Business',
      description: 'For teams',
      isActive: true,
      priceMonthly: 79,
      priceYearly: 790,
      currency: 'usd',
      sortOrder: 3,
      limits: {
        credits: 600,
        creditsRollover: 300,
        overageRate: 0.15,
        maxRepoSize: 500_000,
        projects: -1,
        teamMembers: 10,
        historyDays: 90,
        apiRequestsPerMinute: 300,
        platforms: { web: true, mobile: true, desktop: true },
      },
      features: {
        aiSummary: true,
        aiExplanations: true,
        aiFixSuggestions: true,
        aiPrioritization: true,
        githubIntegration: true,
        githubAction: true,
        slackIntegration: true,
        webhooks: true,
        apiAccess: true,
        vibeScore: true,
        vibeScoreBadge: true,
        oneClickFixes: true,
        aiReviewMerge: true,
        shipItMode: true,
        learningMode: true,
        repoHealthProfile: true,
        explainCodebase: true,
        trustBadge: true,
        teamDashboard: true,
        prioritySupport: true,
      },
    },
  ];

  for (const tier of defaultTiers) {
    await createPricingTier(tier, 'system');
  }
}
