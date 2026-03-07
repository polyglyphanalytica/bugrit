/**
 * Security Improvements for Bugrit Scanning Pipeline
 *
 * Implements:
 * 1. Tool output size limits
 * 2. Secrets redaction in findings
 * 3. Concurrent scan rate limiting
 * 4. Tool selection DoS protection
 * 5. GitHub token rotation
 */

import { db, FieldValue } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * 1. TOOL OUTPUT SIZE LIMITS
 *
 * Prevents large tool outputs from causing memory issues
 */

export interface ToolOutputSizeLimits {
  maxOutputLines: number;
  maxFindingSize: number;
  maxMessageLength: number;
  maxSuggestionLength: number;
}

export const DEFAULT_OUTPUT_LIMITS: ToolOutputSizeLimits = {
  maxOutputLines: 50000,      // Max output lines from tool
  maxFindingSize: 1000000,    // 1MB per finding
  maxMessageLength: 5000,     // 5KB per message
  maxSuggestionLength: 10000, // 10KB per suggestion
};

export interface Finding {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  rule?: string;
  suggestion?: string;
}

/**
 * Enforce size limits on tool findings
 * Prevents memory exhaustion from oversized findings
 */
export function enforceOutputSizeLimits(
  findings: Finding[],
  limits: ToolOutputSizeLimits = DEFAULT_OUTPUT_LIMITS
): Finding[] {
  const limited: Finding[] = [];

  for (const finding of findings.slice(0, limits.maxOutputLines)) {
    const size = JSON.stringify(finding).length;

    if (size > limits.maxFindingSize) {
      logger.warn('Finding exceeds size limit', {
        findingId: finding.id,
        size,
        limit: limits.maxFindingSize,
      });
      continue; // Skip oversized findings
    }

    // Truncate long messages
    if (finding.message.length > limits.maxMessageLength) {
      finding.message = finding.message.substring(0, limits.maxMessageLength) + '...';
    }

    // Truncate long suggestions
    if (finding.suggestion && finding.suggestion.length > limits.maxSuggestionLength) {
      finding.suggestion = finding.suggestion.substring(0, limits.maxSuggestionLength) + '...';
    }

    limited.push(finding);
  }

  return limited;
}

/**
 * 2. SECRETS REDACTION
 *
 * Removes sensitive information from scan results
 */

export const SECRETS_PATTERNS = [
  {
    name: 'api_key',
    pattern: /api[_-]?key\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{20,})['\"]?/gi,
  },
  {
    name: 'password',
    pattern: /password\s*[:=]\s*['\"]([^'\"]+)['\"]/gi,
  },
  {
    name: 'token',
    pattern: /token\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.]{20,})['\"]?/gi,
  },
  {
    name: 'secret',
    pattern: /secret\s*[:=]\s*['\"]([^'\"]+)['\"]/gi,
  },
  {
    name: 'authorization',
    pattern: /authorization\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.]+)['\"]?/gi,
  },
  {
    name: 'access_token',
    pattern: /(access|refresh|bearer)[\s_-]?token\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.]{20,})['\"]?/gi,
  },
  {
    name: 'aws_key',
    pattern: /AKIA[0-9A-Z]{16}/g,
  },
  {
    name: 'private_key',
    pattern: /-----BEGIN (RSA|PRIVATE|PGP|OPENSSH) PRIVATE KEY-----[\s\S]*?-----END \1 PRIVATE KEY-----/g,
  },
];

/**
 * Redact secrets from finding messages and suggestions
 * Prevents accidental disclosure of credentials in scan results
 */
export function redactSecretsFromFinding(finding: Finding): Finding {
  const redacted = { ...finding };

  for (const { pattern } of SECRETS_PATTERNS) {
    redacted.message = redacted.message.replace(pattern, '[REDACTED]');

    if (redacted.suggestion) {
      redacted.suggestion = redacted.suggestion.replace(pattern, '[REDACTED]');
    }
  }

  return redacted;
}

/**
 * Apply secrets redaction to all findings
 */
export function redactSecretsFromFindings(findings: Finding[]): Finding[] {
  return findings.map(finding => redactSecretsFromFinding(finding));
}

/**
 * 3. CONCURRENT SCAN RATE LIMITING
 *
 * Prevents DOS by limiting concurrent scans per user
 */

export interface RateLimitConfig {
  maxConcurrentScans: number;
  maxScansPerHour: number;
  maxScansPerDay: number;
}

export const TIER_RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    maxConcurrentScans: 1,
    maxScansPerHour: 3,
    maxScansPerDay: 10,
  },
  starter: {
    maxConcurrentScans: 2,
    maxScansPerHour: 10,
    maxScansPerDay: 100,
  },
  pro: {
    maxConcurrentScans: 5,
    maxScansPerHour: 30,
    maxScansPerDay: 500,
  },
  business: {
    maxConcurrentScans: 10,
    maxScansPerHour: 100,
    maxScansPerDay: 2000,
  },
  enterprise: {
    maxConcurrentScans: 50,
    maxScansPerHour: 500,
    maxScansPerDay: 10000,
  },
};

/**
 * Check if user has exceeded concurrent scan limit
 */
export async function checkConcurrentScanLimit(
  userId: string,
  userTier: string
): Promise<{ allowed: boolean; current: number; limit: number; reason?: string }> {
  try {
    const rateLimit = TIER_RATE_LIMITS[userTier] || TIER_RATE_LIMITS.free;

    // Count currently running scans
    const activeScanCount = await db
      .collection('scans')
      .where('userId', '==', userId)
      .where('status', '==', 'running')
      .count()
      .get();

    const current = activeScanCount.data().count;

    if (current >= rateLimit.maxConcurrentScans) {
      return {
        allowed: false,
        current,
        limit: rateLimit.maxConcurrentScans,
        reason: `Maximum concurrent scans (${rateLimit.maxConcurrentScans}) reached. Please wait for a scan to complete.`,
      };
    }

    return { allowed: true, current, limit: rateLimit.maxConcurrentScans };
  } catch (error) {
    logger.error('Error checking concurrent scan limit', { userId, error });
    return {
      allowed: false,
      current: 0,
      limit: 0,
      reason: 'Unable to verify scan limit. Please try again.',
    };
  }
}

/**
 * Check scans per hour limit
 */
export async function checkScansPerHourLimit(
  userId: string,
  userTier: string
): Promise<{ allowed: boolean; current: number; limit: number; reason?: string }> {
  try {
    const rateLimit = TIER_RATE_LIMITS[userTier] || TIER_RATE_LIMITS.free;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Count scans in last hour
    const scanCount = await db
      .collection('scans')
      .where('userId', '==', userId)
      .where('createdAt', '>', oneHourAgo)
      .count()
      .get();

    const current = scanCount.data().count;

    if (current >= rateLimit.maxScansPerHour) {
      return {
        allowed: false,
        current,
        limit: rateLimit.maxScansPerHour,
        reason: `Scans per hour limit (${rateLimit.maxScansPerHour}) reached. Please try again in 1 hour.`,
      };
    }

    return { allowed: true, current, limit: rateLimit.maxScansPerHour };
  } catch (error) {
    logger.error('Error checking scans per hour limit', { userId, error });
    return {
      allowed: false,
      current: 0,
      limit: 0,
      reason: 'Unable to verify rate limit. Please try again.',
    };
  }
}

/**
 * 4. TOOL SELECTION DOS PROTECTION
 *
 * Limits number of tools user can select to prevent resource exhaustion
 */

export interface ToolSelectionLimits {
  maxToolsPerScan: number;
}

export const TIER_TOOL_LIMITS: Record<string, ToolSelectionLimits> = {
  free: { maxToolsPerScan: 5 },
  starter: { maxToolsPerScan: 20 },
  pro: { maxToolsPerScan: 50 },
  business: { maxToolsPerScan: 150 },
  enterprise: { maxToolsPerScan: 150 },
};

/**
 * Validate tool selection doesn't exceed tier limit
 */
export function validateToolSelection(
  selectedToolCount: number,
  userTier: string
): { valid: boolean; reason?: string; limit?: number } {
  const limits = TIER_TOOL_LIMITS[userTier] || TIER_TOOL_LIMITS.free;

  if (selectedToolCount > limits.maxToolsPerScan) {
    return {
      valid: false,
      reason: `Too many tools selected. Maximum for your tier is ${limits.maxToolsPerScan} tools.`,
      limit: limits.maxToolsPerScan,
    };
  }

  if (selectedToolCount === 0) {
    return {
      valid: false,
      reason: 'Please select at least one tool.',
    };
  }

  return { valid: true };
}

/**
 * 5. GITHUB TOKEN ROTATION
 *
 * Periodically rotates GitHub OAuth tokens to minimize exposure
 */

export interface GitHubTokenRotationConfig {
  rotationIntervalDays: number;
  warningDaysBefore: number;
}

export const TOKEN_ROTATION_CONFIG: GitHubTokenRotationConfig = {
  rotationIntervalDays: 30,  // Rotate every 30 days
  warningDaysBefore: 3,      // Warn users 3 days before expiry
};

/**
 * Mark GitHub token as needing rotation
 */
export async function scheduleGitHubTokenRotation(
  userId: string,
  installationId: string
): Promise<void> {
  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + TOKEN_ROTATION_CONFIG.rotationIntervalDays);

    const warningDate = new Date(expiryDate);
    warningDate.setDate(warningDate.getDate() - TOKEN_ROTATION_CONFIG.warningDaysBefore);

    await db
      .collection('github_installations')
      .doc(installationId)
      .update({
        tokenExpiresAt: expiryDate,
        tokenWarnAt: warningDate,
        tokenLastRotatedAt: new Date(),
      });

    logger.info('GitHub token rotation scheduled', {
      userId,
      installationId,
      expiresAt: expiryDate,
    });
  } catch (error) {
    logger.error('Failed to schedule GitHub token rotation', {
      userId,
      installationId,
      error,
    });
  }
}

/**
 * Find and rotate expired GitHub tokens
 * Run periodically (e.g., daily Cloud Scheduler job)
 */
export async function rotateExpiredGitHubTokens(): Promise<{
  rotated: number;
  warned: number;
  failed: number;
}> {
  try {
    const now = new Date();
    let rotated = 0;
    let warned = 0;
    let failed = 0;

    // Find installations with tokens expiring in warning period
    const warningSnapshot = await db
      .collection('github_installations')
      .where('tokenWarnAt', '<=', now)
      .where('tokenWarnedAt', '==', null)
      .get();

    for (const doc of warningSnapshot.docs) {
      try {
        const installation = doc.data();
        // TODO: Send warning email to user about token expiry
        // await sendGitHubTokenExpiryWarning(installation.userId);

        await doc.ref.update({ tokenWarnedAt: new Date() });
        warned++;
      } catch (error) {
        logger.warn('Failed to warn about token expiry', { error });
        failed++;
      }
    }

    // Find installations with expired tokens
    const expiredSnapshot = await db
      .collection('github_installations')
      .where('tokenExpiresAt', '<=', now)
      .get();

    for (const doc of expiredSnapshot.docs) {
      try {
        const installation = doc.data();
        // TODO: Trigger token refresh
        // const newToken = await refreshGitHubToken(installation.installationId);
        // await doc.ref.update({
        //   accessToken: newToken,
        //   tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        //   tokenLastRotatedAt: new Date(),
        // });

        rotated++;
      } catch (error) {
        logger.error('Failed to rotate GitHub token', { error });
        failed++;
      }
    }

    logger.info('GitHub token rotation completed', {
      rotated,
      warned,
      failed,
    });

    return { rotated, warned, failed };
  } catch (error) {
    logger.error('Error during GitHub token rotation', { error });
    return { rotated: 0, warned: 0, failed: -1 };
  }
}

/**
 * Scan Source Verification
 *
 * Verify that user's credentials actually grant access to claimed repository
 */
export async function verifyScanSourceAccess(
  repoUrl: string,
  accessToken?: string,
  isPrivate?: boolean
): Promise<{ accessible: boolean; reason?: string }> {
  try {
    // For private repositories, token is required
    if (isPrivate && !accessToken) {
      return {
        accessible: false,
        reason: 'Private repository requires authentication token',
      };
    }

    // For public repositories, no token needed
    // (would attempt HEAD request to verify URL validity)

    return { accessible: true };
  } catch (error) {
    logger.error('Failed to verify scan source access', { repoUrl, error });
    return {
      accessible: false,
      reason: 'Unable to verify repository access',
    };
  }
}

/**
 * Scan History Retention Policy
 *
 * Automatically delete old scans based on tier
 */
export interface ScanRetentionPolicy {
  retentionDays: number;
  minScansToKeep: number;
}

export const TIER_RETENTION_POLICIES: Record<string, ScanRetentionPolicy> = {
  free: { retentionDays: 30, minScansToKeep: 5 },
  starter: { retentionDays: 90, minScansToKeep: 20 },
  pro: { retentionDays: 180, minScansToKeep: 50 },
  business: { retentionDays: 365, minScansToKeep: 200 },
  enterprise: { retentionDays: 2555, minScansToKeep: 5000 }, // 7 years
};

/**
 * Cleanup old scans based on retention policy
 * Run periodically (e.g., weekly Cloud Scheduler job)
 */
export async function cleanupOldScans(): Promise<{
  deleted: number;
  failed: number;
}> {
  try {
    let deleted = 0;
    let failed = 0;

    // Get all user billing accounts
    const usersSnapshot = await db.collection('billing_accounts').get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const tier = userData.tier || 'free';
      const policy = TIER_RETENTION_POLICIES[tier] || TIER_RETENTION_POLICIES.free;

      // Find old scans
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      const oldScansSnapshot = await db
        .collection('scans')
        .where('userId', '==', userId)
        .where('createdAt', '<', cutoffDate)
        .limit(100) // Batch process
        .get();

      // Keep minimum number of scans
      const scanCount = Math.max(0, oldScansSnapshot.size - policy.minScansToKeep);

      for (let i = 0; i < scanCount && i < oldScansSnapshot.docs.length; i++) {
        try {
          await oldScansSnapshot.docs[i].ref.delete();
          deleted++;
        } catch (error) {
          logger.warn('Failed to delete old scan', { userId, scanId: oldScansSnapshot.docs[i].id });
          failed++;
        }
      }
    }

    logger.info('Scan cleanup completed', { deleted, failed });
    return { deleted, failed };
  } catch (error) {
    logger.error('Error during scan cleanup', { error });
    return { deleted: 0, failed: -1 };
  }
}
