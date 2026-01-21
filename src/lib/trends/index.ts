/**
 * Historical Trends Module
 *
 * Tracks security posture over time, calculates trends, and generates insights.
 * Stores data in Firestore for persistence.
 */

import { Severity, ToolCategory } from '../integrations/types';
import { AuditReport } from '../integrations/orchestrator';

// ============================================================
// Types
// ============================================================

export interface TrendDataPoint {
  timestamp: Date;
  scanId: string;
  findings: {
    total: number;
    bySeverity: Record<Severity, number>;
    byCategory: Record<ToolCategory, number>;
    byTool: Record<string, number>;
  };
  scores: {
    overall: number;
    security: number;
    codeQuality: number;
    accessibility: number;
    performance: number;
  };
  newIssues: number;
  resolvedIssues: number;
  duration: number;
}

export interface TrendSummary {
  projectId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: Date;
  endDate: Date;
  dataPoints: number;

  // Current state
  current: {
    totalFindings: number;
    bySeverity: Record<Severity, number>;
    scores: TrendDataPoint['scores'];
  };

  // Changes
  changes: {
    totalFindings: { absolute: number; percentage: number };
    bySeverity: Record<Severity, { absolute: number; percentage: number }>;
    scores: Record<keyof TrendDataPoint['scores'], { absolute: number; percentage: number }>;
  };

  // Trends
  trends: {
    direction: 'improving' | 'stable' | 'degrading';
    velocity: number; // Rate of change per day
    forecast: {
      sevenDays: number;
      thirtyDays: number;
    };
  };

  // Insights
  insights: TrendInsight[];
}

export interface TrendInsight {
  type: 'positive' | 'negative' | 'neutral';
  category: 'security' | 'quality' | 'performance' | 'general';
  title: string;
  description: string;
  metric?: {
    name: string;
    previousValue: number;
    currentValue: number;
    change: number;
  };
  recommendation?: string;
}

export interface ProjectTrendConfig {
  projectId: string;
  retentionDays: number;
  aggregationInterval: 'scan' | 'daily' | 'weekly';
}

// ============================================================
// Trend Calculator
// ============================================================

export class TrendCalculator {
  /**
   * Calculate score from findings
   */
  static calculateScores(findings: TrendDataPoint['findings']): TrendDataPoint['scores'] {
    const { bySeverity, byCategory } = findings;

    // Penalty weights for severities
    const severityWeights = {
      critical: 25,
      high: 10,
      medium: 3,
      low: 1,
      info: 0,
    };

    // Calculate total penalty
    let penalty = 0;
    for (const [severity, count] of Object.entries(bySeverity)) {
      penalty += count * severityWeights[severity as Severity];
    }

    // Overall score (100 - penalty, min 0)
    const overall = Math.max(0, Math.min(100, 100 - penalty));

    // Category-specific scores
    const categoryFindings = byCategory || {};
    const securityPenalty = (categoryFindings.security || 0) * 5;
    const qualityPenalty = (categoryFindings['code-quality'] || 0) * 2;
    const accessibilityPenalty = (categoryFindings.accessibility || 0) * 3;
    const performancePenalty = (categoryFindings.performance || 0) * 2;

    return {
      overall,
      security: Math.max(0, 100 - securityPenalty),
      codeQuality: Math.max(0, 100 - qualityPenalty),
      accessibility: Math.max(0, 100 - accessibilityPenalty),
      performance: Math.max(0, 100 - performancePenalty),
    };
  }

  /**
   * Convert AuditReport to TrendDataPoint
   */
  static fromAuditReport(report: AuditReport, previousFindings?: Set<string>): TrendDataPoint {
    const findings = {
      total: report.summary.totalFindings,
      bySeverity: report.summary.bySeverity as Record<Severity, number>,
      byCategory: report.summary.byCategory as Record<ToolCategory, number>,
      byTool: {} as Record<string, number>,
    };

    // Count findings by tool
    for (const result of report.results) {
      findings.byTool[result.tool] = result.findings.length;
    }

    // Calculate new vs resolved
    const currentFindingIds = new Set(
      report.results.flatMap(r => r.findings.map(f => f.id))
    );

    let newIssues = 0;
    let resolvedIssues = 0;

    if (previousFindings) {
      for (const id of currentFindingIds) {
        if (!previousFindings.has(id)) newIssues++;
      }
      for (const id of previousFindings) {
        if (!currentFindingIds.has(id)) resolvedIssues++;
      }
    } else {
      newIssues = findings.total;
    }

    return {
      timestamp: new Date(report.timestamp),
      scanId: report.id,
      findings,
      scores: this.calculateScores(findings),
      newIssues,
      resolvedIssues,
      duration: report.duration,
    };
  }

  /**
   * Calculate trend summary from data points
   */
  static calculateSummary(
    projectId: string,
    dataPoints: TrendDataPoint[],
    period: TrendSummary['period']
  ): TrendSummary {
    if (dataPoints.length === 0) {
      return this.emptyTrendSummary(projectId, period);
    }

    // Sort by timestamp
    const sorted = [...dataPoints].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // Current state
    const current = {
      totalFindings: last.findings.total,
      bySeverity: { ...last.findings.bySeverity },
      scores: { ...last.scores },
    };

    // Calculate changes
    const changes = this.calculateChanges(first, last);

    // Calculate trend direction and velocity
    const trends = this.calculateTrends(sorted);

    // Generate insights
    const insights = this.generateInsights(first, last, sorted);

    return {
      projectId,
      period,
      startDate: first.timestamp,
      endDate: last.timestamp,
      dataPoints: sorted.length,
      current,
      changes,
      trends,
      insights,
    };
  }

  private static calculateChanges(
    first: TrendDataPoint,
    last: TrendDataPoint
  ): TrendSummary['changes'] {
    const calcChange = (prev: number, curr: number) => ({
      absolute: curr - prev,
      percentage: prev === 0 ? (curr === 0 ? 0 : 100) : ((curr - prev) / prev) * 100,
    });

    const severityChanges = {} as Record<Severity, { absolute: number; percentage: number }>;
    for (const severity of ['critical', 'high', 'medium', 'low', 'info'] as Severity[]) {
      severityChanges[severity] = calcChange(
        first.findings.bySeverity[severity] || 0,
        last.findings.bySeverity[severity] || 0
      );
    }

    const scoreChanges = {} as Record<keyof TrendDataPoint['scores'], { absolute: number; percentage: number }>;
    for (const key of Object.keys(first.scores) as Array<keyof TrendDataPoint['scores']>) {
      scoreChanges[key] = calcChange(first.scores[key], last.scores[key]);
    }

    return {
      totalFindings: calcChange(first.findings.total, last.findings.total),
      bySeverity: severityChanges,
      scores: scoreChanges,
    };
  }

  private static calculateTrends(dataPoints: TrendDataPoint[]): TrendSummary['trends'] {
    if (dataPoints.length < 2) {
      return {
        direction: 'stable',
        velocity: 0,
        forecast: { sevenDays: dataPoints[0]?.findings.total || 0, thirtyDays: dataPoints[0]?.findings.total || 0 },
      };
    }

    // Calculate linear regression for findings over time
    const n = dataPoints.length;
    const xValues = dataPoints.map((_, i) => i);
    const yValues = dataPoints.map(dp => dp.findings.total);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Calculate days between first and last point
    const daysBetween = (dataPoints[n - 1].timestamp.getTime() - dataPoints[0].timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const velocityPerDay = daysBetween > 0 ? slope / (daysBetween / n) : 0;

    // Determine direction
    let direction: 'improving' | 'stable' | 'degrading' = 'stable';
    if (velocityPerDay < -0.5) direction = 'improving';
    else if (velocityPerDay > 0.5) direction = 'degrading';

    // Forecast
    const currentValue = yValues[n - 1];
    const forecast = {
      sevenDays: Math.max(0, Math.round(currentValue + velocityPerDay * 7)),
      thirtyDays: Math.max(0, Math.round(currentValue + velocityPerDay * 30)),
    };

    return { direction, velocity: velocityPerDay, forecast };
  }

  private static generateInsights(
    first: TrendDataPoint,
    last: TrendDataPoint,
    dataPoints: TrendDataPoint[]
  ): TrendInsight[] {
    const insights: TrendInsight[] = [];

    // Critical findings change
    const criticalChange = last.findings.bySeverity.critical - first.findings.bySeverity.critical;
    if (criticalChange < 0) {
      insights.push({
        type: 'positive',
        category: 'security',
        title: 'Critical Vulnerabilities Reduced',
        description: `Reduced critical findings by ${Math.abs(criticalChange)}`,
        metric: {
          name: 'Critical Findings',
          previousValue: first.findings.bySeverity.critical,
          currentValue: last.findings.bySeverity.critical,
          change: criticalChange,
        },
      });
    } else if (criticalChange > 0) {
      insights.push({
        type: 'negative',
        category: 'security',
        title: 'New Critical Vulnerabilities',
        description: `${criticalChange} new critical vulnerabilities detected`,
        metric: {
          name: 'Critical Findings',
          previousValue: first.findings.bySeverity.critical,
          currentValue: last.findings.bySeverity.critical,
          change: criticalChange,
        },
        recommendation: 'Address critical vulnerabilities immediately',
      });
    }

    // Overall score trend
    const scoreChange = last.scores.overall - first.scores.overall;
    if (scoreChange >= 10) {
      insights.push({
        type: 'positive',
        category: 'general',
        title: 'Security Posture Improved',
        description: `Overall security score improved by ${scoreChange.toFixed(1)} points`,
        metric: {
          name: 'Overall Score',
          previousValue: first.scores.overall,
          currentValue: last.scores.overall,
          change: scoreChange,
        },
      });
    } else if (scoreChange <= -10) {
      insights.push({
        type: 'negative',
        category: 'general',
        title: 'Security Posture Degraded',
        description: `Overall security score dropped by ${Math.abs(scoreChange).toFixed(1)} points`,
        metric: {
          name: 'Overall Score',
          previousValue: first.scores.overall,
          currentValue: last.scores.overall,
          change: scoreChange,
        },
        recommendation: 'Review recent changes and address new findings',
      });
    }

    // Resolution rate
    const totalResolved = dataPoints.reduce((sum, dp) => sum + dp.resolvedIssues, 0);
    const totalNew = dataPoints.reduce((sum, dp) => sum + dp.newIssues, 0);

    if (totalResolved > totalNew && totalResolved > 5) {
      insights.push({
        type: 'positive',
        category: 'general',
        title: 'Good Issue Resolution Rate',
        description: `Resolved ${totalResolved} issues vs ${totalNew} new issues`,
      });
    } else if (totalNew > totalResolved * 2 && totalNew > 10) {
      insights.push({
        type: 'negative',
        category: 'general',
        title: 'Issue Accumulation',
        description: `${totalNew} new issues introduced vs only ${totalResolved} resolved`,
        recommendation: 'Allocate time for technical debt reduction',
      });
    }

    return insights;
  }

  private static emptyTrendSummary(projectId: string, period: TrendSummary['period']): TrendSummary {
    const now = new Date();
    return {
      projectId,
      period,
      startDate: now,
      endDate: now,
      dataPoints: 0,
      current: {
        totalFindings: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        scores: { overall: 100, security: 100, codeQuality: 100, accessibility: 100, performance: 100 },
      },
      changes: {
        totalFindings: { absolute: 0, percentage: 0 },
        bySeverity: {
          critical: { absolute: 0, percentage: 0 },
          high: { absolute: 0, percentage: 0 },
          medium: { absolute: 0, percentage: 0 },
          low: { absolute: 0, percentage: 0 },
          info: { absolute: 0, percentage: 0 },
        },
        scores: {
          overall: { absolute: 0, percentage: 0 },
          security: { absolute: 0, percentage: 0 },
          codeQuality: { absolute: 0, percentage: 0 },
          accessibility: { absolute: 0, percentage: 0 },
          performance: { absolute: 0, percentage: 0 },
        },
      },
      trends: {
        direction: 'stable',
        velocity: 0,
        forecast: { sevenDays: 0, thirtyDays: 0 },
      },
      insights: [],
    };
  }
}

// ============================================================
// Trend Storage (Firestore)
// ============================================================

export interface TrendStorageConfig {
  collectionName?: string;
}

export class TrendStorage {
  private db: FirebaseFirestore.Firestore | null = null;
  private collectionName: string;

  constructor(config: TrendStorageConfig = {}) {
    this.collectionName = config.collectionName || 'scan_trends';
  }

  private async getDb(): Promise<FirebaseFirestore.Firestore> {
    if (!this.db) {
      const admin = await import('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp();
      }
      this.db = admin.firestore();
    }
    return this.db;
  }

  /**
   * Store a trend data point
   */
  async store(projectId: string, dataPoint: TrendDataPoint): Promise<void> {
    const db = await this.getDb();
    await db
      .collection(this.collectionName)
      .doc(projectId)
      .collection('dataPoints')
      .doc(dataPoint.scanId)
      .set({
        ...dataPoint,
        timestamp: dataPoint.timestamp.toISOString(),
      });
  }

  /**
   * Get trend data points for a project within a date range
   */
  async getDataPoints(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TrendDataPoint[]> {
    const db = await this.getDb();
    const snapshot = await db
      .collection(this.collectionName)
      .doc(projectId)
      .collection('dataPoints')
      .where('timestamp', '>=', startDate.toISOString())
      .where('timestamp', '<=', endDate.toISOString())
      .orderBy('timestamp', 'asc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        timestamp: new Date(data.timestamp),
      } as TrendDataPoint;
    });
  }

  /**
   * Get the most recent data point
   */
  async getLatestDataPoint(projectId: string): Promise<TrendDataPoint | null> {
    const db = await this.getDb();
    const snapshot = await db
      .collection(this.collectionName)
      .doc(projectId)
      .collection('dataPoints')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const data = snapshot.docs[0].data();
    return {
      ...data,
      timestamp: new Date(data.timestamp),
    } as TrendDataPoint;
  }

  /**
   * Delete data points older than a certain date
   */
  async cleanup(projectId: string, olderThan: Date): Promise<number> {
    const db = await this.getDb();
    const snapshot = await db
      .collection(this.collectionName)
      .doc(projectId)
      .collection('dataPoints')
      .where('timestamp', '<', olderThan.toISOString())
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return snapshot.size;
  }
}

// ============================================================
// Exports
// ============================================================

export function createTrendStorage(config?: TrendStorageConfig): TrendStorage {
  return new TrendStorage(config);
}

export function getPeriodDates(period: TrendSummary['period']): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case 'day':
      start.setDate(start.getDate() - 1);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }

  return { start, end };
}
