/**
 * Admin Module
 *
 * Platform superadmin functionality for managing:
 * - Stripe API configuration
 * - Subscription tiers and pricing
 * - Feature flags
 * - Audit logging
 *
 * Default superadmin: polyglyph.analytica@gmail.com
 * Superadmins bypass all subscription limits.
 */

// Export all types first
export * from './types';
export * from './constants';
// Export service functions
export {
  isPlatformAdmin,
  isPlatformAdminByEmail,
  getPlatformAdminByEmail,
  getPlatformAdmin,
  getAllPlatformAdmins,
  addPlatformAdmin,
  removePlatformAdmin,
  updateAdminLastLogin,
  getStripeConfig,
  getStripeSecretKey,
  getStripeWebhookSecret,
  updateStripeConfig,
  getAllPricingConfigs,
  getPricingConfig,
  updatePricingConfig,
  createPricingTier,
  deletePricingTier,
  getAllFeatureFlags,
  getFeatureFlag,
  updateFeatureFlag,
  createFeatureFlag,
  deleteFeatureFlag,
  logAuditEvent,
  getAuditLogs,
  initializeDefaultSuperadmin,
  isSuperadmin,
  getAllCreditPackages,
  getCreditPackage,
  createCreditPackage,
  updateCreditPackage,
  deleteCreditPackage,
  initializeDefaultCreditPackages,
  initializeDefaultPricing,
} from './service';
export * from './stripe-sync';
export * from './middleware';
