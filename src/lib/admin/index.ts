/**
 * Admin Module
 *
 * Platform superadmin functionality for managing:
 * - Stripe API configuration
 * - Subscription tiers and pricing
 * - Feature flags
 * - Audit logging
 *
 * CONFIGURATION (via Google Secret Manager):
 * - PLATFORM_SUPERADMIN_EMAIL: Platform owner email (superadmin)
 * - ADMIN_ENCRYPTION_KEY: 32-byte hex key for encrypting stored secrets
 *
 * Superadmins bypass all subscription limits.
 */

export * from './types';
export * from './constants';
export * from './service';
export * from './stripe-sync';
export * from './middleware';
