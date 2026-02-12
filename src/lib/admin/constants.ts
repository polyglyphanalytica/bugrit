/**
 * Platform Admin Constants
 *
 * Superadmin configuration loaded from environment variables.
 * Set PLATFORM_SUPERADMIN_EMAIL in Google Secret Manager.
 */

import { devConsole } from '@/lib/console';

// Default superadmin email - bypasses all subscription limits
// Loaded from environment variable for security (supports both env var names)
export const DEFAULT_SUPERADMIN_EMAIL =
  process.env.PLATFORM_SUPERADMIN_EMAIL || process.env.SUPERADMIN_EMAIL || '';

// List of emails that are always superadmins (can't be removed)
// Additional protected emails can be comma-separated in PLATFORM_PROTECTED_ADMINS
const additionalProtectedAdmins = process.env.PLATFORM_PROTECTED_ADMINS?.split(',').map(e => e.trim().toLowerCase()) || [];
export const PROTECTED_SUPERADMIN_EMAILS = [
  DEFAULT_SUPERADMIN_EMAIL.toLowerCase(),
  ...additionalProtectedAdmins,
].filter(Boolean);

// Check if an email is a protected superadmin
export function isProtectedSuperadmin(email: string): boolean {
  return PROTECTED_SUPERADMIN_EMAILS.includes(email.toLowerCase());
}

// Warn if superadmin email is not configured in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.PLATFORM_SUPERADMIN_EMAIL) {
  devConsole.warn('PLATFORM_SUPERADMIN_EMAIL not set - using default. Configure in Secret Manager.');
}
