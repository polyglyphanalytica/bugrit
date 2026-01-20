/**
 * Platform Admin Constants
 *
 * Hardcoded superadmin configuration
 */

// Default superadmin email - bypasses all subscription limits
export const DEFAULT_SUPERADMIN_EMAIL = 'polyglyph.analytica@gmail.com';

// List of emails that are always superadmins (can't be removed)
export const PROTECTED_SUPERADMIN_EMAILS = [
  'polyglyph.analytica@gmail.com',
];

// Check if an email is a protected superadmin
export function isProtectedSuperadmin(email: string): boolean {
  return PROTECTED_SUPERADMIN_EMAILS.includes(email.toLowerCase());
}
