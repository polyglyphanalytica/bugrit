/**
 * Platform Admin Constants
 *
 * Superadmin configuration via environment variables
 */

/**
 * Get the default superadmin email from environment
 * Falls back to empty string if not configured (requires DB setup)
 */
export function getDefaultSuperadminEmail(): string {
  return process.env.SUPERADMIN_EMAIL || '';
}

/**
 * Get list of protected superadmin emails from environment
 * Format: comma-separated list of emails
 * Example: PROTECTED_SUPERADMIN_EMAILS=admin@example.com,super@example.com
 */
export function getProtectedSuperadminEmails(): string[] {
  const envEmails = process.env.PROTECTED_SUPERADMIN_EMAILS;
  if (!envEmails) {
    // Fall back to SUPERADMIN_EMAIL if PROTECTED_SUPERADMIN_EMAILS not set
    const defaultEmail = getDefaultSuperadminEmail();
    return defaultEmail ? [defaultEmail] : [];
  }
  return envEmails.split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
}

// Legacy exports for backward compatibility (read from env)
export const DEFAULT_SUPERADMIN_EMAIL = getDefaultSuperadminEmail();
export const PROTECTED_SUPERADMIN_EMAILS = getProtectedSuperadminEmails();

/**
 * Check if an email is a protected superadmin
 */
export function isProtectedSuperadmin(email: string): boolean {
  const protectedEmails = getProtectedSuperadminEmails();
  return protectedEmails.includes(email.toLowerCase());
}
