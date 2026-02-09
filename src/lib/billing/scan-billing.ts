/**
 * Scan Billing Integration
 *
 * Handles credit checking, deduction, and billing for scans.
 * Integrates with auto top-up for seamless API usage.
 */

import { db, FieldValue } from '@/lib/firebase/admin';
import { calculateCredits, canAffordScan, SUBSCRIPTION_TIERS, SubscriptionTier, ScanConfig, CreditEstimate, CREDIT_COSTS } from './credits';
import { deductCreditsWithAutoTopup } from './auto-topup';
import { logger } from '@/lib/logger';
import { ToolCategory } from '@/lib/tools/registry';
import { ToolCategory as IntegrationsToolCategory } from '@/lib/integrations/types';

export interface BillingAccount {
  userId: string;
  tier: SubscriptionTier;
  credits: {
    remaining: number;
    included: number;
    used: number;
    purchased: number;
    rollover: number;
    reserved?: number;
  };
  subscription: {
    status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'none';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Date;
    lastPaymentFailedAt?: Date;
  };
}

export interface PreScanCheck {
  allowed: boolean;
  estimate: CreditEstimate;
  currentBalance: number;
  reason?: string;
  requiresConfirmation?: boolean;
  overage?: {
    amount: number;
    cost: number;
    rate: number;
  };
}

export interface PostScanBilling {
  success: boolean;
  creditsCharged: number;
  newBalance: number;
  autoTopupTriggered: boolean;
  autoTopupCredits?: number;
  error?: string;
}

/**
 * Get user's billing account from Firestore
 */
export async function getBillingAccount(userId: string): Promise<BillingAccount | null> {
  try {
    const billingDoc = await db.collection('billing_accounts').doc(userId).get();

    if (!billingDoc.exists) {
      // Create default free tier account
      const defaultAccount: BillingAccount = {
        userId,
        tier: 'free',
        credits: {
          remaining: SUBSCRIPTION_TIERS.free.credits,
          included: SUBSCRIPTION_TIERS.free.credits,
          used: 0,
          purchased: 0,
          rollover: 0,
        },
        subscription: {
          status: 'none',
        },
      };

      await db.collection('billing_accounts').doc(userId).set(defaultAccount);
      return defaultAccount;
    }

    return billingDoc.data() as BillingAccount;
  } catch (error) {
    logger.error('Failed to get billing account', { userId, error });
    return null;
  }
}

/**
 * Count lines of code in a directory
 */
export async function countLinesOfCode(targetPath: string): Promise<number> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const codeExtensions = new Set([
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
      '.py', '.pyw',
      '.java', '.kt', '.kts',
      '.go',
      '.rs',
      '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp',
      '.cs',
      '.rb',
      '.php',
      '.swift',
      '.scala',
      '.vue', '.svelte',
      '.html', '.htm', '.css', '.scss', '.sass', '.less',
      '.json', '.yaml', '.yml', '.xml', '.toml',
      '.md', '.mdx',
      '.sql',
      '.sh', '.bash', '.zsh',
      '.dockerfile',
    ]);

    const ignoreDirs = new Set([
      'node_modules', '.git', '.svn', '.hg',
      'vendor', 'deps', '__pycache__', '.pytest_cache',
      'build', 'dist', 'target', 'out', '.next',
      'coverage', '.nyc_output',
    ]);

    let totalLines = 0;

    async function walkDir(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (!ignoreDirs.has(entry.name) && !entry.name.startsWith('.')) {
              await walkDir(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (codeExtensions.has(ext)) {
              try {
                const content = await fs.readFile(fullPath, 'utf-8');
                const lines = content.split('\n').length;
                totalLines += lines;
              } catch {
                // Skip files we can't read
              }
            }
          }
        }
      } catch {
        // Skip directories we can't access
      }
    }

    await walkDir(targetPath);
    return totalLines;
  } catch (error) {
    logger.warn('Failed to count lines of code', { targetPath, error });
    return 0;
  }
}

/**
 * Check if user can afford a scan BEFORE running it.
 * Call this before starting any scan.
 *
 * This checks:
 * 1. Subscription status (incomplete users cannot scan with paid tier features)
 * 2. Credit balance
 * 3. Overage eligibility
 */
export async function checkScanAffordability(
  userId: string,
  config: ScanConfig
): Promise<PreScanCheck> {
  const account = await getBillingAccount(userId);

  if (!account) {
    return {
      allowed: false,
      estimate: {
        breakdown: { base: 0, lines: 0, tools: {} as Record<ToolCategory, number>, ai: { summary: 0, issue_explanations: 0, priority_scoring: 0, fix_suggestions: 0 } },
        total: 0,
        warnings: [],
      },
      currentBalance: 0,
      reason: 'Billing account not found',
    };
  }

  // Check subscription status - incomplete means payment is pending (e.g., 3D Secure)
  // Users with incomplete status should not be able to use paid tier features
  if (account.subscription.status === 'incomplete') {
    return {
      allowed: false,
      estimate: {
        breakdown: { base: 0, lines: 0, tools: {} as Record<ToolCategory, number>, ai: { summary: 0, issue_explanations: 0, priority_scoring: 0, fix_suggestions: 0 } },
        total: 0,
        warnings: [],
      },
      currentBalance: account.credits.remaining,
      reason: 'Your subscription payment is pending. Please complete the payment to continue.',
    };
  }

  // For past_due, we allow scanning but at free tier limits if they've exceeded their credits
  // This gives users a grace period while they fix their payment
  const effectiveTier = account.subscription.status === 'past_due' && account.credits.remaining <= 0
    ? 'free' as SubscriptionTier
    : account.tier;

  const estimate = calculateCredits(config);
  const affordCheck = canAffordScan(account.credits.remaining, estimate, effectiveTier);
  const tierConfig = SUBSCRIPTION_TIERS[effectiveTier];

  let overage: PreScanCheck['overage'];
  let requiresConfirmation = false;

  if (estimate.total > account.credits.remaining) {
    if (tierConfig.overageRate) {
      const overageAmount = estimate.total - account.credits.remaining;
      overage = {
        amount: overageAmount,
        cost: overageAmount * tierConfig.overageRate,
        rate: tierConfig.overageRate,
      };
      requiresConfirmation = true;
    }
  }

  return {
    allowed: affordCheck.allowed,
    estimate,
    currentBalance: account.credits.remaining,
    reason: affordCheck.reason,
    requiresConfirmation,
    overage,
  };
}

/**
 * Deduct credits after a scan completes.
 * Calculates actual cost based on real metrics and triggers auto top-up if needed.
 */
export async function billForCompletedScan(
  userId: string,
  scanId: string,
  actualMetrics: {
    linesOfCode: number;
    categoriesRun: ToolCategory[];
    aiFeatures: string[];
    issuesFound: number;
  }
): Promise<PostScanBilling> {
  try {
    // Calculate actual credit cost
    const config: ScanConfig = {
      categories: actualMetrics.categoriesRun,
      aiFeatures: actualMetrics.aiFeatures as any[],
      estimatedLines: actualMetrics.linesOfCode,
      estimatedIssues: actualMetrics.issuesFound,
    };

    const estimate = calculateCredits(config);

    // Deduct credits with auto top-up check
    const deductResult = await deductCreditsWithAutoTopup(
      userId,
      estimate.total,
      `Scan completed: ${scanId}`,
      {
        scanId,
        linesOfCode: actualMetrics.linesOfCode,
        categories: actualMetrics.categoriesRun,
        aiFeatures: actualMetrics.aiFeatures,
        breakdown: estimate.breakdown,
      }
    );

    if (!deductResult.success) {
      logger.error('Failed to deduct credits for scan', {
        userId,
        scanId,
        error: deductResult.error,
      });

      return {
        success: false,
        creditsCharged: 0,
        newBalance: 0,
        autoTopupTriggered: false,
        error: deductResult.error,
      };
    }

    // Record the scan billing in Firestore
    await db.collection('scan_billing').add({
      userId,
      scanId,
      creditsCharged: estimate.total,
      breakdown: estimate.breakdown,
      metrics: actualMetrics,
      balanceAfter: deductResult.remainingCredits,
      autoTopupTriggered: deductResult.autoTopupTriggered,
      autoTopupCredits: deductResult.autoTopupResult?.creditsAdded,
      timestamp: new Date(),
    });

    logger.info('Scan billed successfully', {
      userId,
      scanId,
      creditsCharged: estimate.total,
      newBalance: deductResult.remainingCredits,
      autoTopupTriggered: deductResult.autoTopupTriggered,
    });

    return {
      success: true,
      creditsCharged: estimate.total,
      newBalance: deductResult.remainingCredits,
      autoTopupTriggered: deductResult.autoTopupTriggered,
      autoTopupCredits: deductResult.autoTopupResult?.creditsAdded,
    };
  } catch (error) {
    logger.error('Scan billing error', { userId, scanId, error });
    return {
      success: false,
      creditsCharged: 0,
      newBalance: 0,
      autoTopupTriggered: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reserve credits before starting a scan (optimistic deduction).
 * This prevents users from starting multiple scans that exceed their balance.
 */
export async function reserveCreditsForScan(
  userId: string,
  scanId: string,
  estimatedCost: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const billingRef = db.collection('billing_accounts').doc(userId);

    // Use a Firestore transaction to atomically check balance and reserve credits.
    // This prevents race conditions where two concurrent scans could both pass the
    // balance check before either deducts, leading to negative balances.
    const result = await db.runTransaction(async (tx) => {
      const billingDoc = await tx.get(billingRef);

      if (!billingDoc.exists) {
        return { success: false as const, error: 'Billing account not found' };
      }

      const data = billingDoc.data()!;
      const remaining = data.credits?.remaining ?? 0;
      const reserved = data.credits?.reserved ?? 0;
      const tier: SubscriptionTier = data.tier || 'free';

      // Check if they can afford it
      if (remaining < estimatedCost) {
        const tierConfig = SUBSCRIPTION_TIERS[tier];
        if (!tierConfig.overageRate) {
          return {
            success: false as const,
            error: `Insufficient credits. Need ${estimatedCost}, have ${remaining}`,
          };
        }
      }

      // Create the reservation doc
      tx.set(db.collection('credit_reservations').doc(scanId), {
        userId,
        scanId,
        amount: estimatedCost,
        status: 'reserved',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
      });

      // Atomically deduct from available balance within the transaction
      tx.update(billingRef, {
        'credits.remaining': remaining - estimatedCost,
        'credits.reserved': reserved + estimatedCost,
      });

      return { success: true as const };
    });

    return result;
  } catch (error) {
    logger.error('Credit reservation error', { userId, scanId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Finalize or adjust a credit reservation after scan completes.
 */
export async function finalizeReservation(
  scanId: string,
  actualCost: number
): Promise<void> {
  try {
    const reservationDoc = await db.collection('credit_reservations').doc(scanId).get();

    if (!reservationDoc.exists) {
      logger.warn('No reservation found for scan', { scanId });
      return;
    }

    const reservation = reservationDoc.data();
    const userId = reservation?.userId;
    const reservedAmount = reservation?.amount || 0;
    const difference = reservedAmount - actualCost;

    // Update billing account
    if (difference !== 0) {
      await db.collection('billing_accounts').doc(userId).update({
        'credits.remaining': FieldValue.increment(difference),
        'credits.reserved': FieldValue.increment(-reservedAmount),
        'credits.used': FieldValue.increment(actualCost),
      });
    } else {
      await db.collection('billing_accounts').doc(userId).update({
        'credits.reserved': FieldValue.increment(-reservedAmount),
        'credits.used': FieldValue.increment(actualCost),
      });
    }

    // Mark reservation as finalized
    await db.collection('credit_reservations').doc(scanId).update({
      status: 'finalized',
      actualCost,
      finalizedAt: new Date(),
    });

    // Check for auto top-up after finalization
    const account = await getBillingAccount(userId);
    if (account) {
      const { checkAndTriggerAutoTopup } = await import('./auto-topup');
      await checkAndTriggerAutoTopup(userId, account.credits.remaining);
    }
  } catch (error) {
    logger.error('Reservation finalization error', { scanId, error });
  }
}

/**
 * Check if repository size is within tier limits.
 * Returns an error message if exceeded, null if OK.
 */
export async function checkRepoSizeLimit(
  userId: string,
  linesOfCode: number
): Promise<{ allowed: boolean; maxAllowed: number; reason?: string }> {
  const account = await getBillingAccount(userId);

  if (!account) {
    return {
      allowed: false,
      maxAllowed: 0,
      reason: 'Billing account not found',
    };
  }

  const tierConfig = SUBSCRIPTION_TIERS[account.tier];
  const maxRepoSize = tierConfig.features.maxRepoSize;

  // -1 means unlimited
  if (maxRepoSize === -1) {
    return { allowed: true, maxAllowed: -1 };
  }

  if (linesOfCode > maxRepoSize) {
    const formattedMax = maxRepoSize >= 1000
      ? `${(maxRepoSize / 1000).toFixed(0)}K`
      : maxRepoSize.toString();
    const formattedActual = linesOfCode >= 1000
      ? `${(linesOfCode / 1000).toFixed(0)}K`
      : linesOfCode.toString();

    return {
      allowed: false,
      maxAllowed: maxRepoSize,
      reason: `Repository size (${formattedActual} lines) exceeds your ${account.tier} tier limit of ${formattedMax} lines. Upgrade to scan larger repositories.`,
    };
  }

  return { allowed: true, maxAllowed: maxRepoSize };
}

/**
 * Release a credit reservation (scan was cancelled or failed before completion).
 */
export async function releaseReservation(scanId: string): Promise<void> {
  try {
    const reservationDoc = await db.collection('credit_reservations').doc(scanId).get();

    if (!reservationDoc.exists) {
      return;
    }

    const reservation = reservationDoc.data();
    const userId = reservation?.userId;
    const reservedAmount = reservation?.amount || 0;

    // Return credits to user
    await db.collection('billing_accounts').doc(userId).update({
      'credits.remaining': FieldValue.increment(reservedAmount),
      'credits.reserved': FieldValue.increment(-reservedAmount),
    });

    // Mark reservation as released
    await db.collection('credit_reservations').doc(scanId).update({
      status: 'released',
      releasedAt: new Date(),
    });
  } catch (error) {
    logger.error('Reservation release error', { scanId, error });
  }
}

/**
 * Calculate and refund credits for failed/timed out tools.
 * Called when finalizing a scan session with partial failures.
 */
export interface ToolRefundInfo {
  toolName: string;
  category: IntegrationsToolCategory;
  status: 'failed' | 'timeout' | 'skipped';
  reason: string;
}

export interface RefundResult {
  success: boolean;
  refundedCredits: number;
  toolsRefunded: string[];
  newBalance: number;
  error?: string;
}

export async function refundCreditsForFailedTools(
  userId: string,
  sessionId: string,
  failedTools: ToolRefundInfo[],
  estimatedLines: number
): Promise<RefundResult> {
  if (failedTools.length === 0) {
    const account = await getBillingAccount(userId);
    return {
      success: true,
      refundedCredits: 0,
      toolsRefunded: [],
      newBalance: account?.credits.remaining || 0,
    };
  }

  try {
    // Calculate credit refund per tool category
    // Map integration category names to canonical credit costs from credits.ts
    const INTEGRATION_TO_BILLING: Partial<Record<IntegrationsToolCategory, ToolCategory>> = {
      'code-quality': 'quality',
      'security': 'security',
      'accessibility': 'accessibility',
      'performance': 'performance',
      'api-testing': 'api-security',
      'api-schema': 'api-security',
      'api-security': 'api-security',
      'secret-scanning': 'security',
      'mobile': 'mobile',
      'dependencies': 'dependencies',
      'cloud-native': 'cloud-native',
      'documentation': 'documentation',
      'iac-security': 'cloud-native',
      'license': 'dependencies',
      'database': 'quality',
      'complexity': 'quality',
      'coverage': 'quality',
      'visual': 'accessibility',
      'observability': 'performance',
      'chaos': 'performance',
    };
    const CATEGORY_CREDITS: Partial<Record<IntegrationsToolCategory, number>> = {};
    for (const [intCat, billCat] of Object.entries(INTEGRATION_TO_BILLING)) {
      CATEGORY_CREDITS[intCat as IntegrationsToolCategory] = CREDIT_COSTS.TOOLS[billCat as ToolCategory] || 1;
    }

    // Calculate lines multiplier (matches credits.ts logic)
    const linesMultiplier = estimatedLines > 100000 ? 2 :
                           estimatedLines > 50000 ? 1.5 :
                           estimatedLines > 10000 ? 1.2 : 1;

    let totalRefund = 0;
    const toolsRefunded: string[] = [];

    for (const tool of failedTools) {
      const baseCost = CATEGORY_CREDITS[tool.category] || 1;
      const adjustedCost = Math.ceil(baseCost * linesMultiplier);
      totalRefund += adjustedCost;
      toolsRefunded.push(tool.toolName);
    }

    if (totalRefund === 0) {
      const account = await getBillingAccount(userId);
      return {
        success: true,
        refundedCredits: 0,
        toolsRefunded: [],
        newBalance: account?.credits.remaining || 0,
      };
    }

    // Add credits back to user's account
    await db.collection('billing_accounts').doc(userId).update({
      'credits.remaining': FieldValue.increment(totalRefund),
      'credits.used': FieldValue.increment(-totalRefund),
    });

    // Record the refund
    await db.collection('credit_refunds').add({
      userId,
      sessionId,
      refundedCredits: totalRefund,
      toolsRefunded,
      failedTools: failedTools.map(t => ({
        name: t.toolName,
        category: t.category,
        status: t.status,
        reason: t.reason,
      })),
      timestamp: new Date(),
    });

    // Get updated balance
    const account = await getBillingAccount(userId);
    const newBalance = account?.credits.remaining || 0;

    logger.info('Credits refunded for failed tools', {
      userId,
      sessionId,
      refundedCredits: totalRefund,
      toolsCount: toolsRefunded.length,
      newBalance,
    });

    return {
      success: true,
      refundedCredits: totalRefund,
      toolsRefunded,
      newBalance,
    };
  } catch (error) {
    logger.error('Credit refund error', { userId, sessionId, error });
    return {
      success: false,
      refundedCredits: 0,
      toolsRefunded: [],
      newBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate estimated credits for a set of tool categories.
 * Used for pre-scan estimation.
 */
export function estimateCreditsForTools(
  categories: IntegrationsToolCategory[],
  estimatedLines: number
): number {
  const CATEGORY_CREDITS: Partial<Record<IntegrationsToolCategory, number>> = {
    'code-quality': 1,
    'security': 2,
    'accessibility': 1,
    'performance': 3,
    'api-testing': 2,
    'api-schema': 1,
    'api-security': 2,
    'visual': 2,
    'coverage': 1,
    'observability': 2,
    'chaos': 5,
    'complexity': 1,
    'database': 2,
    'documentation': 1,
    'iac-security': 2,
    'license': 1,
    'secret-scanning': 2,
    'mobile': 3,
    'dependencies': 1,
    'cloud-native': 2,
  };

  const linesMultiplier = estimatedLines > 100000 ? 2 :
                         estimatedLines > 50000 ? 1.5 :
                         estimatedLines > 10000 ? 1.2 : 1;

  let total = 0;
  for (const category of categories) {
    const baseCost = CATEGORY_CREDITS[category] || 1;
    total += Math.ceil(baseCost * linesMultiplier);
  }

  return total;
}
