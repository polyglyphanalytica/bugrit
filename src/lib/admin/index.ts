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

export * from './types';
export * from './constants';
export * from './service';
export * from './stripe-sync';
export * from './middleware';
