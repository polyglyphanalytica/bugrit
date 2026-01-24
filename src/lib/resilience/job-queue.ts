/**
 * Persistent Job Queue with Dead Letter Queue
 *
 * Provides durable scan job processing that survives restarts.
 * Failed jobs are moved to a dead letter queue for investigation.
 */

import { db } from '@/lib/firebase/admin';
import { logger } from '@/lib/logger';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'dead';
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export interface ScanJob {
  id: string;
  scanId: string;
  organizationId: string;
  userId: string;
  priority: JobPriority;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;

  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  nextRetryAt?: Date;

  // Processing
  workerId?: string;
  lockedAt?: Date;
  lockExpiresAt?: Date;

  // Error tracking
  lastError?: string;
  errorHistory: Array<{
    attempt: number;
    error: string;
    timestamp: Date;
  }>;

  // Scan configuration
  config: {
    applicationId: string;
    sourceType: string;
    repoUrl?: string;
    branch?: string;
    targetUrl?: string;
    tools?: string[];
    categories?: string[];
  };

  // Results
  result?: {
    reportId?: string;
    totalFindings?: number;
    toolsRun?: string[];
    toolsFailed?: string[];
  };
}

export interface DeadLetterJob {
  id: string;
  originalJobId: string;
  scanId: string;
  organizationId: string;
  userId: string;

  movedAt: Date;
  reason: string;
  attempts: number;

  errorHistory: Array<{
    attempt: number;
    error: string;
    timestamp: Date;
  }>;

  config: ScanJob['config'];

  // Manual review fields
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: 'retry' | 'discard' | 'manual_fix';
  resolutionNotes?: string;
}

const COLLECTION = 'scan_jobs';
const DLQ_COLLECTION = 'dead_letter_queue';
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Priority weights for job ordering
 */
const PRIORITY_WEIGHTS: Record<JobPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

/**
 * Persistent Job Queue Implementation
 */
export class JobQueue {
  private workerId: string;

  constructor(workerId?: string) {
    this.workerId = workerId || `worker-${process.pid}-${Date.now()}`;
  }

  /**
   * Enqueue a new scan job
   */
  async enqueue(params: {
    scanId: string;
    organizationId: string;
    userId: string;
    config: ScanJob['config'];
    priority?: JobPriority;
    maxAttempts?: number;
  }): Promise<ScanJob> {
    // Generate cryptographically secure random ID
    const randomBytes = new Uint8Array(5);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    } else {
      const nodeCrypto = require('crypto');
      const nodeRandom = nodeCrypto.randomBytes(5);
      randomBytes.set(nodeRandom);
    }
    const random = Array.from(randomBytes)
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .substring(0, 9);
    const jobId = `job-${Date.now()}-${random}`;

    const job: ScanJob = {
      id: jobId,
      scanId: params.scanId,
      organizationId: params.organizationId,
      userId: params.userId,
      priority: params.priority || 'normal',
      status: 'pending',
      attempts: 0,
      maxAttempts: params.maxAttempts || DEFAULT_MAX_ATTEMPTS,
      createdAt: new Date(),
      errorHistory: [],
      config: params.config,
    };

    await db.collection(COLLECTION).doc(jobId).set({
      ...job,
      createdAt: Timestamp.fromDate(job.createdAt),
      priorityWeight: PRIORITY_WEIGHTS[job.priority],
    });

    logger.info('Job enqueued', {
      jobId,
      scanId: params.scanId,
      priority: job.priority,
    });

    return job;
  }

  /**
   * Claim the next available job for processing
   * Uses distributed locking to prevent duplicate processing
   */
  async claimNext(): Promise<ScanJob | null> {
    const now = new Date();
    const lockExpiry = new Date(now.getTime() + LOCK_DURATION_MS);

    // Query for next available job
    // Priority: 1. Priority weight DESC, 2. Created time ASC
    const query = db.collection(COLLECTION)
      .where('status', 'in', ['pending', 'running'])
      .orderBy('priorityWeight', 'desc')
      .orderBy('createdAt', 'asc')
      .limit(10); // Get a few candidates

    const snapshot = await query.get();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Skip if locked by another worker
      if (data.status === 'running' && data.lockExpiresAt) {
        const lockExpires = data.lockExpiresAt.toDate();
        if (lockExpires > now) {
          continue; // Still locked
        }
        // Lock expired - can reclaim
      }

      // Skip if waiting for retry
      if (data.nextRetryAt) {
        const nextRetry = data.nextRetryAt.toDate();
        if (nextRetry > now) {
          continue; // Not ready yet
        }
      }

      // Attempt to claim with transaction
      try {
        const claimed = await db.runTransaction(async (txn: FirebaseFirestore.Transaction) => {
          const jobDoc = await txn.get(doc.ref);
          const jobData = jobDoc.data();

          if (!jobData) return null;

          // Double-check status
          if (jobData.status === 'completed' || jobData.status === 'failed' || jobData.status === 'dead') {
            return null;
          }

          // Check lock again
          if (jobData.lockExpiresAt && jobData.lockExpiresAt.toDate() > now) {
            if (jobData.workerId !== this.workerId) {
              return null;
            }
          }

          // Claim the job
          txn.update(doc.ref, {
            status: 'running',
            workerId: this.workerId,
            lockedAt: Timestamp.fromDate(now),
            lockExpiresAt: Timestamp.fromDate(lockExpiry),
            startedAt: jobData.startedAt || Timestamp.fromDate(now),
            attempts: FieldValue.increment(1),
          });

          return {
            ...jobData,
            id: doc.id,
            status: 'running' as JobStatus,
            workerId: this.workerId,
            attempts: (jobData.attempts || 0) + 1,
          } as Record<string, unknown>;
        });

        if (claimed) {
          logger.info('Job claimed', {
            jobId: claimed.id,
            scanId: claimed.scanId as string,
            workerId: this.workerId,
            attempt: claimed.attempts,
          });

          return this.deserializeJob(claimed);
        }
      } catch (error) {
        // Transaction failed, try next job
        logger.debug('Failed to claim job, trying next', {
          jobId: doc.id,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    return null;
  }

  /**
   * Mark job as completed successfully
   */
  async complete(jobId: string, result?: ScanJob['result']): Promise<void> {
    await db.collection(COLLECTION).doc(jobId).update({
      status: 'completed',
      completedAt: Timestamp.fromDate(new Date()),
      result: result || {},
      lockedAt: FieldValue.delete(),
      lockExpiresAt: FieldValue.delete(),
      workerId: FieldValue.delete(),
    });

    logger.info('Job completed', { jobId, result });
  }

  /**
   * Mark job as failed, potentially scheduling retry or moving to DLQ
   */
  async fail(jobId: string, error: Error): Promise<{ retrying: boolean; movedToDLQ: boolean }> {
    const jobDoc = await db.collection(COLLECTION).doc(jobId).get();
    const job = jobDoc.data() as ScanJob;

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const errorEntry = {
      attempt: job.attempts,
      error: error.message,
      timestamp: new Date(),
    };

    // Check if we should retry
    if (job.attempts < job.maxAttempts) {
      // Calculate exponential backoff delay
      const baseDelay = 5000; // 5 seconds
      const delay = baseDelay * Math.pow(2, job.attempts - 1);
      const nextRetry = new Date(Date.now() + delay);

      await db.collection(COLLECTION).doc(jobId).update({
        status: 'pending',
        lastError: error.message,
        errorHistory: FieldValue.arrayUnion({
          ...errorEntry,
          timestamp: Timestamp.fromDate(errorEntry.timestamp),
        }),
        nextRetryAt: Timestamp.fromDate(nextRetry),
        lockedAt: FieldValue.delete(),
        lockExpiresAt: FieldValue.delete(),
        workerId: FieldValue.delete(),
      });

      logger.warn('Job failed, scheduling retry', {
        jobId,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
        nextRetry: nextRetry.toISOString(),
        error: error.message,
      });

      return { retrying: true, movedToDLQ: false };
    }

    // Max retries exceeded - move to DLQ
    await this.moveToDLQ(jobId, job, error, errorEntry);

    return { retrying: false, movedToDLQ: true };
  }

  /**
   * Move failed job to Dead Letter Queue
   */
  private async moveToDLQ(
    jobId: string,
    job: ScanJob,
    error: Error,
    lastErrorEntry: { attempt: number; error: string; timestamp: Date }
  ): Promise<void> {
    // Generate cryptographically secure random ID
    const dlqRandomBytes = new Uint8Array(5);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(dlqRandomBytes);
    } else {
      const nodeCrypto = require('crypto');
      const nodeRandom = nodeCrypto.randomBytes(5);
      dlqRandomBytes.set(nodeRandom);
    }
    const dlqRandom = Array.from(dlqRandomBytes)
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .substring(0, 9);
    const dlqId = `dlq-${Date.now()}-${dlqRandom}`;

    const dlqJob: DeadLetterJob = {
      id: dlqId,
      originalJobId: jobId,
      scanId: job.scanId,
      organizationId: job.organizationId,
      userId: job.userId,
      movedAt: new Date(),
      reason: `Max retries (${job.maxAttempts}) exceeded: ${error.message}`,
      attempts: job.attempts,
      errorHistory: [
        ...job.errorHistory,
        lastErrorEntry,
      ],
      config: job.config,
      reviewed: false,
    };

    // Use batch to atomically update job and create DLQ entry
    const batch = db.batch();

    batch.update(db.collection(COLLECTION).doc(jobId), {
      status: 'dead',
      lastError: error.message,
      completedAt: Timestamp.fromDate(new Date()),
      errorHistory: FieldValue.arrayUnion({
        ...lastErrorEntry,
        timestamp: Timestamp.fromDate(lastErrorEntry.timestamp),
      }),
      dlqId,
      lockedAt: FieldValue.delete(),
      lockExpiresAt: FieldValue.delete(),
      workerId: FieldValue.delete(),
    });

    batch.set(db.collection(DLQ_COLLECTION).doc(dlqId), {
      ...dlqJob,
      movedAt: Timestamp.fromDate(dlqJob.movedAt),
      errorHistory: dlqJob.errorHistory.map(e => ({
        ...e,
        timestamp: Timestamp.fromDate(e.timestamp),
      })),
    });

    await batch.commit();

    logger.error('Job moved to Dead Letter Queue', {
      jobId,
      dlqId,
      scanId: job.scanId,
      attempts: job.attempts,
      reason: dlqJob.reason,
    });
  }

  /**
   * Extend lock on a job (for long-running operations)
   */
  async extendLock(jobId: string, durationMs: number = LOCK_DURATION_MS): Promise<void> {
    const lockExpiry = new Date(Date.now() + durationMs);

    await db.collection(COLLECTION).doc(jobId).update({
      lockExpiresAt: Timestamp.fromDate(lockExpiry),
    });

    logger.debug('Lock extended', { jobId, expiresAt: lockExpiry.toISOString() });
  }

  /**
   * Release lock without completing (e.g., worker shutdown)
   */
  async releaseLock(jobId: string): Promise<void> {
    await db.collection(COLLECTION).doc(jobId).update({
      status: 'pending',
      lockedAt: FieldValue.delete(),
      lockExpiresAt: FieldValue.delete(),
      workerId: FieldValue.delete(),
    });

    logger.info('Lock released', { jobId, workerId: this.workerId });
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<ScanJob | null> {
    const doc = await db.collection(COLLECTION).doc(jobId).get();
    if (!doc.exists) return null;
    return this.deserializeJob({ id: doc.id, ...doc.data() });
  }

  /**
   * Get jobs by scan ID
   */
  async getJobsByScan(scanId: string): Promise<ScanJob[]> {
    const snapshot = await db.collection(COLLECTION)
      .where('scanId', '==', scanId)
      .get();

    return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) =>
      this.deserializeJob({ id: doc.id, ...doc.data() })
    );
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    dead: number;
    dlqSize: number;
  }> {
    const [pending, running, completed, failed, dead, dlq] = await Promise.all([
      db.collection(COLLECTION).where('status', '==', 'pending').count().get(),
      db.collection(COLLECTION).where('status', '==', 'running').count().get(),
      db.collection(COLLECTION).where('status', '==', 'completed').count().get(),
      db.collection(COLLECTION).where('status', '==', 'failed').count().get(),
      db.collection(COLLECTION).where('status', '==', 'dead').count().get(),
      db.collection(DLQ_COLLECTION).where('reviewed', '==', false).count().get(),
    ]);

    return {
      pending: pending.data().count,
      running: running.data().count,
      completed: completed.data().count,
      failed: failed.data().count,
      dead: dead.data().count,
      dlqSize: dlq.data().count,
    };
  }

  /**
   * Get Dead Letter Queue entries
   */
  async getDLQEntries(limit: number = 50, unreviewed: boolean = true): Promise<DeadLetterJob[]> {
    let query = db.collection(DLQ_COLLECTION).orderBy('movedAt', 'desc');

    if (unreviewed) {
      query = query.where('reviewed', '==', false);
    }

    const snapshot = await query.limit(limit).get();

    return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      ...doc.data(),
      id: doc.id,
      movedAt: doc.data().movedAt?.toDate() || new Date(),
      errorHistory: (doc.data().errorHistory || []).map((e: { timestamp: Timestamp; attempt: number; error: string }) => ({
        ...e,
        timestamp: e.timestamp?.toDate() || new Date(),
      })),
    } as DeadLetterJob));
  }

  /**
   * Retry a job from the DLQ
   */
  async retryFromDLQ(dlqId: string, reviewerId: string): Promise<ScanJob> {
    const dlqDoc = await db.collection(DLQ_COLLECTION).doc(dlqId).get();
    const dlqJob = dlqDoc.data() as DeadLetterJob;

    if (!dlqJob) {
      throw new Error(`DLQ entry not found: ${dlqId}`);
    }

    // Create new job
    const newJob = await this.enqueue({
      scanId: dlqJob.scanId,
      organizationId: dlqJob.organizationId,
      userId: dlqJob.userId,
      config: dlqJob.config,
      priority: 'high', // Elevated priority for retries
    });

    // Mark DLQ entry as reviewed
    await db.collection(DLQ_COLLECTION).doc(dlqId).update({
      reviewed: true,
      reviewedBy: reviewerId,
      reviewedAt: Timestamp.fromDate(new Date()),
      resolution: 'retry',
      resolutionNotes: `Retried as job ${newJob.id}`,
    });

    logger.info('DLQ entry retried', {
      dlqId,
      newJobId: newJob.id,
      reviewerId,
    });

    return newJob;
  }

  /**
   * Discard a job from the DLQ
   */
  async discardFromDLQ(
    dlqId: string,
    reviewerId: string,
    notes?: string
  ): Promise<void> {
    await db.collection(DLQ_COLLECTION).doc(dlqId).update({
      reviewed: true,
      reviewedBy: reviewerId,
      reviewedAt: Timestamp.fromDate(new Date()),
      resolution: 'discard',
      resolutionNotes: notes || 'Discarded by reviewer',
    });

    logger.info('DLQ entry discarded', { dlqId, reviewerId, notes });
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const snapshot = await db.collection(COLLECTION)
      .where('status', '==', 'completed')
      .where('completedAt', '<', Timestamp.fromDate(cutoff))
      .limit(500)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => batch.delete(doc.ref));
    await batch.commit();

    logger.info('Cleaned up old jobs', {
      deleted: snapshot.size,
      olderThanDays,
    });

    return snapshot.size;
  }

  /**
   * Deserialize job from Firestore
   */
  private deserializeJob(data: Record<string, unknown>): ScanJob {
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      startedAt: (data.startedAt as Timestamp)?.toDate(),
      completedAt: (data.completedAt as Timestamp)?.toDate(),
      nextRetryAt: (data.nextRetryAt as Timestamp)?.toDate(),
      lockedAt: (data.lockedAt as Timestamp)?.toDate(),
      lockExpiresAt: (data.lockExpiresAt as Timestamp)?.toDate(),
      errorHistory: ((data.errorHistory as Array<{ timestamp: Timestamp; attempt: number; error: string }>) || []).map(e => ({
        ...e,
        timestamp: e.timestamp?.toDate() || new Date(),
      })),
    } as ScanJob;
  }
}

// Export singleton instance
export const jobQueue = new JobQueue();
