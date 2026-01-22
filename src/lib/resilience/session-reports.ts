/**
 * Session-Based Tool Report Storage
 *
 * Stores individual tool reports in Firestore under user/session structure.
 * Enables real-time aggregation via polling instead of in-memory waiting.
 *
 * Structure:
 * users/{userId}/sessions/{sessionId}/tool_reports/{toolName}
 */

import { getDb, generateId, toTimestamp, Timestamp, COLLECTIONS } from '@/lib/firestore';
import { AuditResult, AuditTarget, ToolCategory } from '@/lib/integrations/types';
import { IntelligenceReport } from '@/lib/integrations/ai';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

export interface SessionConfig {
  userId: string;
  organizationId?: string;
  scanId?: string;
  target: AuditTarget;
  toolsRequested: string[];
  createdAt: Date;
  expiresAt: Date;
}

export interface ToolReport {
  toolName: string;
  category: ToolCategory;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: AuditResult;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  attempts: number;
  lastUpdated: Date;
}

export interface RefundInfo {
  refundedCredits: number;
  toolsRefunded: string[];
  newBalance: number;
}

export interface AggregatedReport {
  sessionId: string;
  userId: string;
  status: 'initializing' | 'running' | 'completed' | 'partial' | 'failed';
  target: AuditTarget;
  progress: {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    running: number;
    pending: number;
    percentage: number;
  };
  toolReports: Record<string, ToolReport>;
  summary: {
    totalFindings: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    toolsRun: string[];
    toolsSkipped: string[];
    toolsFailed: string[];
  };
  intelligence?: IntelligenceReport;
  refund?: RefundInfo;
  createdAt: Date;
  lastUpdated: Date;
  completedAt?: Date;
  duration?: number;
}

const SESSIONS_COLLECTION = 'audit_sessions';
const TOOL_REPORTS_SUBCOLLECTION = 'tool_reports';

/**
 * Session Report Store
 * Manages individual tool reports with real-time polling support
 */
export class SessionReportStore {
  /**
   * Create a new audit session
   */
  async createSession(config: SessionConfig): Promise<string> {
    const db = getDb();
    if (!db) {
      throw new Error('Firestore not available');
    }

    const sessionId = generateId('session');
    const now = new Date();

    const sessionDoc = {
      id: sessionId,
      userId: config.userId,
      organizationId: config.organizationId || null,
      scanId: config.scanId || null,
      target: config.target,
      toolsRequested: config.toolsRequested,
      status: 'initializing' as const,
      progress: {
        total: config.toolsRequested.length,
        completed: 0,
        failed: 0,
        skipped: 0,
        running: 0,
        pending: config.toolsRequested.length,
        percentage: 0,
      },
      createdAt: toTimestamp(now),
      expiresAt: toTimestamp(config.expiresAt),
      lastUpdated: toTimestamp(now),
    };

    await db.collection(SESSIONS_COLLECTION).doc(sessionId).set(sessionDoc);

    // Initialize all tool reports as pending
    const batch = db.batch();
    for (const toolName of config.toolsRequested) {
      const reportRef = db
        .collection(SESSIONS_COLLECTION)
        .doc(sessionId)
        .collection(TOOL_REPORTS_SUBCOLLECTION)
        .doc(toolName.toLowerCase());

      batch.set(reportRef, {
        toolName,
        category: null, // Will be set when tool starts
        status: 'pending',
        attempts: 0,
        lastUpdated: toTimestamp(now),
      });
    }

    await batch.commit();

    logger.info('Audit session created', {
      sessionId,
      userId: config.userId,
      toolsCount: config.toolsRequested.length,
    });

    return sessionId;
  }

  /**
   * Mark a tool as started
   */
  async markToolStarted(
    sessionId: string,
    toolName: string,
    category: ToolCategory
  ): Promise<void> {
    const db = getDb();
    if (!db) return;

    const now = new Date();
    const reportRef = db
      .collection(SESSIONS_COLLECTION)
      .doc(sessionId)
      .collection(TOOL_REPORTS_SUBCOLLECTION)
      .doc(toolName.toLowerCase());

    await reportRef.update({
      status: 'running',
      category,
      startedAt: toTimestamp(now),
      lastUpdated: toTimestamp(now),
      attempts: FieldValue.increment(1),
    });

    // Update session progress atomically (pending -> running)
    await this.updateProgressAtomic(sessionId, 'pending', 'running');

    logger.debug('Tool started', { sessionId, toolName, category });
  }

  /**
   * Store a completed tool report
   */
  async storeToolReport(
    sessionId: string,
    toolName: string,
    result: AuditResult
  ): Promise<void> {
    const db = getDb();
    if (!db) return;

    const now = new Date();
    const reportRef = db
      .collection(SESSIONS_COLLECTION)
      .doc(sessionId)
      .collection(TOOL_REPORTS_SUBCOLLECTION)
      .doc(toolName.toLowerCase());

    // Get existing report to calculate duration
    const existingDoc = await reportRef.get();
    const existingData = existingDoc.data();
    const startedAt = existingData?.startedAt?.toDate() || now;
    const duration = now.getTime() - startedAt.getTime();
    const newStatus = result.success ? 'completed' : 'failed';

    const reportData: Record<string, unknown> = {
      toolName,
      category: result.category,
      status: newStatus,
      result: this.serializeResult(result),
      completedAt: toTimestamp(now),
      duration,
      lastUpdated: toTimestamp(now),
    };

    if (!result.success && result.error) {
      reportData.error = result.error;
    }

    await reportRef.update(reportData);

    // Update session progress atomically (running -> completed/failed)
    await this.updateProgressAtomic(sessionId, 'running', newStatus as 'completed' | 'failed');

    // Update summary with incremental data instead of full recalculation
    await this.updateSummaryIncremental(sessionId, result);

    logger.info('Tool report stored', {
      sessionId,
      toolName,
      success: result.success,
      findingsCount: result.findings.length,
      duration,
    });
  }

  /**
   * Mark a tool as skipped
   */
  async markToolSkipped(
    sessionId: string,
    toolName: string,
    reason: string
  ): Promise<void> {
    const db = getDb();
    if (!db) return;

    const now = new Date();
    const reportRef = db
      .collection(SESSIONS_COLLECTION)
      .doc(sessionId)
      .collection(TOOL_REPORTS_SUBCOLLECTION)
      .doc(toolName.toLowerCase());

    // Get current status to determine transition
    const existingDoc = await reportRef.get();
    const fromStatus = existingDoc.data()?.status as 'pending' | 'running' | null;

    await reportRef.update({
      status: 'skipped',
      error: reason,
      completedAt: toTimestamp(now),
      lastUpdated: toTimestamp(now),
    });

    // Update session progress atomically
    await this.updateProgressAtomic(sessionId, fromStatus, 'skipped');

    logger.info('Tool skipped', { sessionId, toolName, reason });
  }

  /**
   * Mark a tool as failed
   */
  async markToolFailed(
    sessionId: string,
    toolName: string,
    error: string
  ): Promise<void> {
    const db = getDb();
    if (!db) return;

    const now = new Date();
    const reportRef = db
      .collection(SESSIONS_COLLECTION)
      .doc(sessionId)
      .collection(TOOL_REPORTS_SUBCOLLECTION)
      .doc(toolName.toLowerCase());

    // Get current status to determine transition
    const existingDoc = await reportRef.get();
    const fromStatus = existingDoc.data()?.status as 'pending' | 'running' | null;

    await reportRef.update({
      status: 'failed',
      error,
      completedAt: toTimestamp(now),
      lastUpdated: toTimestamp(now),
    });

    // Update session progress atomically
    await this.updateProgressAtomic(sessionId, fromStatus, 'failed');

    logger.warn('Tool failed', { sessionId, toolName, error });
  }

  /**
   * Get current aggregated report (for polling)
   */
  async getAggregatedReport(sessionId: string): Promise<AggregatedReport | null> {
    const db = getDb();
    if (!db) return null;

    // Get session document
    const sessionDoc = await db.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    if (!sessionDoc.exists) {
      return null;
    }

    const sessionData = sessionDoc.data()!;

    // Get all tool reports
    const toolReportsSnapshot = await db
      .collection(SESSIONS_COLLECTION)
      .doc(sessionId)
      .collection(TOOL_REPORTS_SUBCOLLECTION)
      .get();

    const toolReports: Record<string, ToolReport> = {};
    for (const doc of toolReportsSnapshot.docs) {
      const data = doc.data();
      toolReports[doc.id] = {
        toolName: data.toolName,
        category: data.category,
        status: data.status,
        result: data.result ? this.deserializeResult(data.result) : undefined,
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        duration: data.duration,
        error: data.error,
        attempts: data.attempts || 0,
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
      };
    }

    // Build summary from tool reports
    const summary = this.buildSummaryFromReports(toolReports);

    // Determine overall status
    const progress = sessionData.progress;
    let status: AggregatedReport['status'] = 'running';
    if (progress.pending === 0 && progress.running === 0) {
      if (progress.failed > 0 && progress.completed === 0) {
        status = 'failed';
      } else if (progress.failed > 0) {
        status = 'partial';
      } else {
        status = 'completed';
      }
    } else if (progress.running > 0 || progress.completed > 0) {
      status = 'running';
    } else {
      status = 'initializing';
    }

    return {
      sessionId,
      userId: sessionData.userId,
      status,
      target: sessionData.target,
      progress: sessionData.progress,
      toolReports,
      summary,
      intelligence: sessionData.intelligence,
      refund: sessionData.refund,
      createdAt: sessionData.createdAt?.toDate() || new Date(),
      lastUpdated: sessionData.lastUpdated?.toDate() || new Date(),
      completedAt: sessionData.completedAt?.toDate(),
      duration: sessionData.duration,
    };
  }

  /**
   * Get minimal progress update (lightweight polling)
   */
  async getProgress(sessionId: string): Promise<{
    status: string;
    progress: AggregatedReport['progress'];
    lastUpdated: Date;
  } | null> {
    const db = getDb();
    if (!db) return null;

    const sessionDoc = await db.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    if (!sessionDoc.exists) {
      return null;
    }

    const data = sessionDoc.data()!;
    return {
      status: data.status,
      progress: data.progress,
      lastUpdated: data.lastUpdated?.toDate() || new Date(),
    };
  }

  /**
   * Get newly completed reports since a timestamp
   */
  async getNewReports(
    sessionId: string,
    since: Date
  ): Promise<ToolReport[]> {
    const db = getDb();
    if (!db) return [];

    const snapshot = await db
      .collection(SESSIONS_COLLECTION)
      .doc(sessionId)
      .collection(TOOL_REPORTS_SUBCOLLECTION)
      .where('lastUpdated', '>', toTimestamp(since))
      .where('status', 'in', ['completed', 'failed', 'skipped'])
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        toolName: data.toolName,
        category: data.category,
        status: data.status,
        result: data.result ? this.deserializeResult(data.result) : undefined,
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        duration: data.duration,
        error: data.error,
        attempts: data.attempts || 0,
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
      };
    });
  }

  /**
   * Store AI intelligence report
   */
  async storeIntelligence(
    sessionId: string,
    intelligence: IntelligenceReport
  ): Promise<void> {
    const db = getDb();
    if (!db) return;

    await db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
      intelligence,
      lastUpdated: toTimestamp(new Date()),
    });

    logger.info('Intelligence report stored', { sessionId });
  }

  /**
   * Store refund information for failed tools
   */
  async storeRefundInfo(
    sessionId: string,
    refundInfo: RefundInfo
  ): Promise<void> {
    const db = getDb();
    if (!db) return;

    await db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
      refund: refundInfo,
      lastUpdated: toTimestamp(new Date()),
    });

    logger.info('Refund info stored', {
      sessionId,
      refundedCredits: refundInfo.refundedCredits,
      toolsRefunded: refundInfo.toolsRefunded.length,
    });
  }

  /**
   * Mark session as completed
   */
  async completeSession(sessionId: string): Promise<void> {
    const db = getDb();
    if (!db) return;

    const now = new Date();
    const sessionDoc = await db.collection(SESSIONS_COLLECTION).doc(sessionId).get();
    const sessionData = sessionDoc.data();
    const createdAt = sessionData?.createdAt?.toDate() || now;
    const duration = now.getTime() - createdAt.getTime();

    await db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
      status: 'completed',
      completedAt: toTimestamp(now),
      duration,
      lastUpdated: toTimestamp(now),
    });

    logger.info('Session completed', { sessionId, duration });
  }

  /**
   * Get sessions for a user
   */
  async getUserSessions(
    userId: string,
    limit: number = 20
  ): Promise<Array<{ sessionId: string; status: string; createdAt: Date; progress: AggregatedReport['progress'] }>> {
    const db = getDb();
    if (!db) return [];

    const snapshot = await db
      .collection(SESSIONS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        sessionId: doc.id,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        progress: data.progress,
      };
    });
  }

  /**
   * Delete expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const db = getDb();
    if (!db) return 0;

    const now = new Date();
    const snapshot = await db
      .collection(SESSIONS_COLLECTION)
      .where('expiresAt', '<', toTimestamp(now))
      .limit(100)
      .get();

    if (snapshot.empty) return 0;

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      // Delete subcollection documents first
      const toolReports = await doc.ref.collection(TOOL_REPORTS_SUBCOLLECTION).get();
      for (const reportDoc of toolReports.docs) {
        batch.delete(reportDoc.ref);
      }
      batch.delete(doc.ref);
    }

    await batch.commit();

    logger.info('Expired sessions cleaned up', { count: snapshot.size });
    return snapshot.size;
  }

  /**
   * Update progress atomically using Firestore increment
   * Instead of querying all reports (N+1), we use atomic increments
   */
  private async updateProgressAtomic(
    sessionId: string,
    fromStatus: 'pending' | 'running' | null,
    toStatus: 'running' | 'completed' | 'failed' | 'skipped'
  ): Promise<void> {
    const db = getDb();
    if (!db) return;

    const sessionRef = db.collection(SESSIONS_COLLECTION).doc(sessionId);

    // Use a transaction to update progress and compute derived values
    await db.runTransaction(async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists) return;

      const data = sessionDoc.data()!;
      const progress = { ...data.progress };

      // Decrement the old status counter if there was one
      if (fromStatus) {
        progress[fromStatus] = Math.max(0, (progress[fromStatus] || 0) - 1);
      }

      // Increment the new status counter
      progress[toStatus] = (progress[toStatus] || 0) + 1;

      // Recalculate percentage and overall status
      const finishedCount = progress.completed + progress.failed + progress.skipped;
      progress.percentage = progress.total > 0
        ? Math.round((finishedCount / progress.total) * 100)
        : 0;

      // Determine overall status
      let status: string = 'running';
      if (progress.pending === progress.total) {
        status = 'initializing';
      } else if (finishedCount === progress.total) {
        if (progress.failed === progress.total) {
          status = 'failed';
        } else if (progress.failed > 0) {
          status = 'partial';
        } else {
          status = 'completed';
        }
      }

      transaction.update(sessionRef, {
        status,
        progress,
        lastUpdated: toTimestamp(new Date()),
      });
    });
  }

  /**
   * Update session progress counts (DEPRECATED - use updateProgressAtomic)
   * Kept for backward compatibility and full recalculation when needed
   */
  private async updateSessionProgress(sessionId: string): Promise<void> {
    const db = getDb();
    if (!db) return;

    const toolReportsSnapshot = await db
      .collection(SESSIONS_COLLECTION)
      .doc(sessionId)
      .collection(TOOL_REPORTS_SUBCOLLECTION)
      .get();

    let pending = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;
    let skipped = 0;

    for (const doc of toolReportsSnapshot.docs) {
      const status = doc.data().status;
      switch (status) {
        case 'pending': pending++; break;
        case 'running': running++; break;
        case 'completed': completed++; break;
        case 'failed': failed++; break;
        case 'skipped': skipped++; break;
      }
    }

    const total = toolReportsSnapshot.size;
    const finishedCount = completed + failed + skipped;
    const percentage = total > 0 ? Math.round((finishedCount / total) * 100) : 0;

    // Determine status
    let status: string = 'running';
    if (pending === total) {
      status = 'initializing';
    } else if (finishedCount === total) {
      if (failed === total) {
        status = 'failed';
      } else if (failed > 0) {
        status = 'partial';
      } else {
        status = 'completed';
      }
    }

    await db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
      status,
      progress: {
        total,
        pending,
        running,
        completed,
        failed,
        skipped,
        percentage,
      },
      lastUpdated: toTimestamp(new Date()),
    });
  }

  /**
   * Update session summary incrementally from a single tool result
   * Avoids N+1 query by using atomic increments for finding counts
   */
  private async updateSummaryIncremental(
    sessionId: string,
    result: AuditResult
  ): Promise<void> {
    const db = getDb();
    if (!db) return;

    if (!result.success || !result.findings || result.findings.length === 0) {
      return;
    }

    const sessionRef = db.collection(SESSIONS_COLLECTION).doc(sessionId);

    // Use transaction to safely increment counters
    await db.runTransaction(async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      if (!sessionDoc.exists) return;

      const data = sessionDoc.data()!;
      const summary = data.summary || {
        totalFindings: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        byCategory: {},
        toolsRun: [],
        toolsSkipped: [],
        toolsFailed: [],
      };

      // Increment counts from this tool's findings
      for (const finding of result.findings) {
        summary.totalFindings++;
        summary.bySeverity[finding.severity] = (summary.bySeverity[finding.severity] || 0) + 1;
        summary.byCategory[finding.category] = (summary.byCategory[finding.category] || 0) + 1;
      }

      // Add tool to toolsRun list
      if (!summary.toolsRun.includes(result.tool)) {
        summary.toolsRun.push(result.tool);
      }

      transaction.update(sessionRef, {
        summary,
        lastUpdated: toTimestamp(new Date()),
      });
    });
  }

  /**
   * Update session summary from tool reports (DEPRECATED - use updateSummaryIncremental)
   * Kept for full recalculation when needed (e.g., recovery scenarios)
   */
  private async updateSessionSummary(sessionId: string): Promise<void> {
    const db = getDb();
    if (!db) return;

    const toolReportsSnapshot = await db
      .collection(SESSIONS_COLLECTION)
      .doc(sessionId)
      .collection(TOOL_REPORTS_SUBCOLLECTION)
      .where('status', '==', 'completed')
      .get();

    const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const byCategory: Record<string, number> = {};
    let totalFindings = 0;

    for (const doc of toolReportsSnapshot.docs) {
      const data = doc.data();
      if (data.result?.findings) {
        for (const finding of data.result.findings) {
          totalFindings++;
          bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
          byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
        }
      }
    }

    await db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
      'summary.totalFindings': totalFindings,
      'summary.bySeverity': bySeverity,
      'summary.byCategory': byCategory,
      lastUpdated: toTimestamp(new Date()),
    });
  }

  /**
   * Build summary from tool reports map
   */
  private buildSummaryFromReports(
    toolReports: Record<string, ToolReport>
  ): AggregatedReport['summary'] {
    const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const byCategory: Record<string, number> = {};
    const toolsRun: string[] = [];
    const toolsSkipped: string[] = [];
    const toolsFailed: string[] = [];
    let totalFindings = 0;

    for (const [, report] of Object.entries(toolReports)) {
      if (report.status === 'completed') {
        toolsRun.push(report.toolName);
        if (report.result?.findings) {
          for (const finding of report.result.findings) {
            totalFindings++;
            bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
            byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
          }
        }
      } else if (report.status === 'skipped') {
        toolsSkipped.push(report.toolName);
      } else if (report.status === 'failed') {
        toolsFailed.push(report.toolName);
      }
    }

    return {
      totalFindings,
      bySeverity,
      byCategory,
      toolsRun,
      toolsSkipped,
      toolsFailed,
    };
  }

  /**
   * Serialize AuditResult for Firestore
   */
  private serializeResult(result: AuditResult): Record<string, unknown> {
    return {
      tool: result.tool,
      category: result.category,
      success: result.success,
      duration: result.duration,
      findings: result.findings,
      summary: result.summary,
      metadata: result.metadata || null,
      error: result.error || null,
    };
  }

  /**
   * Deserialize AuditResult from Firestore
   */
  private deserializeResult(data: Record<string, unknown>): AuditResult {
    return {
      tool: data.tool as string,
      category: data.category as ToolCategory,
      success: data.success as boolean,
      duration: data.duration as number,
      findings: data.findings as AuditResult['findings'],
      summary: data.summary as AuditResult['summary'],
      metadata: data.metadata as Record<string, unknown> | undefined,
      error: data.error as string | undefined,
    };
  }
}

// Export singleton instance
export const sessionReportStore = new SessionReportStore();
