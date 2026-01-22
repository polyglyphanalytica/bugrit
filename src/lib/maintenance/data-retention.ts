/**
 * Data Retention Service
 *
 * Enforces historyDays limits by cleaning up old scan data based on organization tier.
 * This should be run periodically via a scheduled job (Cloud Scheduler, cron, etc.)
 */

import { getDb, COLLECTIONS } from '../firestore';
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '../billing/credits';
import { logger } from '../logger';

export interface RetentionResult {
  organizationId: string;
  tier: SubscriptionTier;
  historyDays: number;
  scansDeleted: number;
  testCasesDeleted: number;
  issuesDeleted: number;
  reportsDeleted: number;
}

export interface RetentionSummary {
  startedAt: Date;
  completedAt: Date;
  organizationsProcessed: number;
  totalScansDeleted: number;
  totalTestCasesDeleted: number;
  totalIssuesDeleted: number;
  totalReportsDeleted: number;
  results: RetentionResult[];
  errors: Array<{ organizationId: string; error: string }>;
}

/**
 * Get the historyDays limit for a tier
 */
function getHistoryDays(tier: SubscriptionTier): number {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  return tierConfig?.features?.historyDays ?? 30;
}

/**
 * Calculate the cutoff date for a given tier
 */
function getCutoffDate(historyDays: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - historyDays);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

/**
 * Run data retention cleanup for a single organization
 */
export async function cleanupOrganizationData(
  organizationId: string,
  tier: SubscriptionTier
): Promise<RetentionResult> {
  const db = getDb();
  if (!db) {
    logger.warn('Firestore not available for data retention cleanup');
    return {
      organizationId,
      tier,
      historyDays: getHistoryDays(tier),
      scansDeleted: 0,
      testCasesDeleted: 0,
      issuesDeleted: 0,
      reportsDeleted: 0,
    };
  }

  const historyDays = getHistoryDays(tier);
  const cutoffDate = getCutoffDate(historyDays);

  logger.info('Running data retention cleanup', {
    organizationId,
    tier,
    historyDays,
    cutoffDate: cutoffDate.toISOString(),
  });

  let scansDeleted = 0;
  let testCasesDeleted = 0;
  let issuesDeleted = 0;
  let reportsDeleted = 0;

  try {
    // Find old scans for this organization
    const scansSnapshot = await db
      .collection(COLLECTIONS.SCANS)
      .where('organizationId', '==', organizationId)
      .where('createdAt', '<', cutoffDate)
      .get();

    const scanIds: string[] = [];

    // Delete scans in batches
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;

    for (const scanDoc of scansSnapshot.docs) {
      scanIds.push(scanDoc.id);
      batch.delete(scanDoc.ref);
      batchCount++;
      scansDeleted++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    // Delete related test cases
    if (scanIds.length > 0) {
      // Process in chunks of 10 (Firestore 'in' query limit)
      for (let i = 0; i < scanIds.length; i += 10) {
        const chunkIds = scanIds.slice(i, i + 10);

        const testCasesSnapshot = await db
          .collection(COLLECTIONS.SCAN_TEST_CASES)
          .where('scanId', 'in', chunkIds)
          .get();

        const testCaseBatch = db.batch();
        for (const doc of testCasesSnapshot.docs) {
          testCaseBatch.delete(doc.ref);
          testCasesDeleted++;
        }
        if (testCasesSnapshot.docs.length > 0) {
          await testCaseBatch.commit();
        }

        // Delete issues
        const issuesSnapshot = await db
          .collection(COLLECTIONS.SCAN_ISSUES)
          .where('scanId', 'in', chunkIds)
          .get();

        const issuesBatch = db.batch();
        for (const doc of issuesSnapshot.docs) {
          issuesBatch.delete(doc.ref);
          issuesDeleted++;
        }
        if (issuesSnapshot.docs.length > 0) {
          await issuesBatch.commit();
        }

        // Delete reports
        const reportsSnapshot = await db
          .collection(COLLECTIONS.REPORTS)
          .where('scanId', 'in', chunkIds)
          .get();

        const reportsBatch = db.batch();
        for (const doc of reportsSnapshot.docs) {
          reportsBatch.delete(doc.ref);
          reportsDeleted++;
        }
        if (reportsSnapshot.docs.length > 0) {
          await reportsBatch.commit();
        }
      }
    }

    logger.info('Data retention cleanup completed for organization', {
      organizationId,
      scansDeleted,
      testCasesDeleted,
      issuesDeleted,
      reportsDeleted,
    });
  } catch (error) {
    logger.error('Data retention cleanup failed for organization', {
      organizationId,
      error,
    });
    throw error;
  }

  return {
    organizationId,
    tier,
    historyDays,
    scansDeleted,
    testCasesDeleted,
    issuesDeleted,
    reportsDeleted,
  };
}

/**
 * Run data retention cleanup for all organizations
 * This is the main entry point for the scheduled job
 */
export async function runDataRetention(): Promise<RetentionSummary> {
  const startedAt = new Date();
  const results: RetentionResult[] = [];
  const errors: Array<{ organizationId: string; error: string }> = [];

  const db = getDb();
  if (!db) {
    logger.warn('Firestore not available for data retention');
    return {
      startedAt,
      completedAt: new Date(),
      organizationsProcessed: 0,
      totalScansDeleted: 0,
      totalTestCasesDeleted: 0,
      totalIssuesDeleted: 0,
      totalReportsDeleted: 0,
      results: [],
      errors: [],
    };
  }

  logger.info('Starting data retention cleanup for all organizations');

  try {
    // Get all organizations with their subscription tier
    const orgsSnapshot = await db.collection(COLLECTIONS.ORGANIZATIONS).get();

    for (const orgDoc of orgsSnapshot.docs) {
      const orgData = orgDoc.data();
      const organizationId = orgDoc.id;
      const tier = (orgData?.subscription?.tier || 'free') as SubscriptionTier;

      try {
        const result = await cleanupOrganizationData(organizationId, tier);
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ organizationId, error: errorMessage });
        logger.error('Failed to cleanup organization', { organizationId, error: errorMessage });
      }
    }
  } catch (error) {
    logger.error('Data retention job failed', { error });
  }

  const completedAt = new Date();

  const summary: RetentionSummary = {
    startedAt,
    completedAt,
    organizationsProcessed: results.length,
    totalScansDeleted: results.reduce((sum, r) => sum + r.scansDeleted, 0),
    totalTestCasesDeleted: results.reduce((sum, r) => sum + r.testCasesDeleted, 0),
    totalIssuesDeleted: results.reduce((sum, r) => sum + r.issuesDeleted, 0),
    totalReportsDeleted: results.reduce((sum, r) => sum + r.reportsDeleted, 0),
    results,
    errors,
  };

  logger.info('Data retention cleanup completed', {
    organizationsProcessed: summary.organizationsProcessed,
    totalScansDeleted: summary.totalScansDeleted,
    totalTestCasesDeleted: summary.totalTestCasesDeleted,
    duration: completedAt.getTime() - startedAt.getTime(),
  });

  return summary;
}

/**
 * Preview what would be deleted without actually deleting
 * Useful for dry-run testing
 */
export async function previewDataRetention(organizationId?: string): Promise<{
  organizations: Array<{
    organizationId: string;
    tier: SubscriptionTier;
    historyDays: number;
    cutoffDate: Date;
    scansToDelete: number;
  }>;
}> {
  const db = getDb();
  if (!db) {
    return { organizations: [] };
  }

  const organizations: Array<{
    organizationId: string;
    tier: SubscriptionTier;
    historyDays: number;
    cutoffDate: Date;
    scansToDelete: number;
  }> = [];

  let orgsQuery = db.collection(COLLECTIONS.ORGANIZATIONS);

  if (organizationId) {
    const orgDoc = await orgsQuery.doc(organizationId).get();
    if (orgDoc.exists) {
      const orgData = orgDoc.data();
      const tier = (orgData?.subscription?.tier || 'free') as SubscriptionTier;
      const historyDays = getHistoryDays(tier);
      const cutoffDate = getCutoffDate(historyDays);

      const scansSnapshot = await db
        .collection(COLLECTIONS.SCANS)
        .where('organizationId', '==', organizationId)
        .where('createdAt', '<', cutoffDate)
        .count()
        .get();

      organizations.push({
        organizationId,
        tier,
        historyDays,
        cutoffDate,
        scansToDelete: scansSnapshot.data().count,
      });
    }
  } else {
    const orgsSnapshot = await orgsQuery.get();

    for (const orgDoc of orgsSnapshot.docs) {
      const orgData = orgDoc.data();
      const tier = (orgData?.subscription?.tier || 'free') as SubscriptionTier;
      const historyDays = getHistoryDays(tier);
      const cutoffDate = getCutoffDate(historyDays);

      const scansSnapshot = await db
        .collection(COLLECTIONS.SCANS)
        .where('organizationId', '==', orgDoc.id)
        .where('createdAt', '<', cutoffDate)
        .count()
        .get();

      organizations.push({
        organizationId: orgDoc.id,
        tier,
        historyDays,
        cutoffDate,
        scansToDelete: scansSnapshot.data().count,
      });
    }
  }

  return { organizations };
}
