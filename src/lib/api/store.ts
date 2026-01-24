/**
 * API Data Store
 *
 * Provides data access layer for the v1 API.
 * Uses Firestore with in-memory fallback for demo mode.
 */

import * as db from '../db/v1-api';

// Re-export types from the database module
export type {
  Platform,
  ScanStatus,
  TestStatus,
  Severity,
  Project,
  Scan,
  ScanTestCase,
  ScanIssue,
  Report,
} from '../db/v1-api';

// Re-export database functions
export const {
  // Projects
  createProject,
  getProject,
  getProjectsByOrganization,
  updateProject,
  deleteProject,
  // Scans
  createScan,
  getScan,
  getScansByProject,
  getScansByOrganization,
  updateScan,
  // Test Cases
  createTestCase,
  getTestCase,
  getTestCasesByScan,
  updateTestCase,
  deleteTestCase,
  // Issues
  createIssue,
  getIssuesByScan,
  // Reports
  createReport,
  getReport,
  getReportByScan,
  getReportsByOrganization,
  generateReportFromScan,
  // Limits
  checkProjectLimit,
  checkScanLimit,
  checkPlatformAccess,
  // Rate limits by tier
  TIER_RATE_LIMITS,
} = db;

// Generate unique IDs using cryptographically secure random (kept for compatibility)
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomBytes = new Uint8Array(5);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for Node.js environments
    const nodeCrypto = require('crypto');
    const nodeRandom = nodeCrypto.randomBytes(5);
    randomBytes.set(nodeRandom);
  }
  const random = Array.from(randomBytes)
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 7);
  return `${prefix}-${timestamp}${random}`;
}

// ============================================================================
// Helper Functions for API Routes
// ============================================================================

/**
 * Start a scan (update status to running)
 */
export async function startScan(scanId: string): Promise<db.Scan | null> {
  return db.updateScan(scanId, {
    status: 'running',
    startedAt: new Date(),
  });
}

/**
 * Complete a scan with summary
 */
export async function completeScan(
  scanId: string,
  testCases: db.ScanTestCase[]
): Promise<db.Scan | null> {
  const passed = testCases.filter((t) => t.status === 'passed').length;
  const failed = testCases.filter((t) => t.status === 'failed').length;
  const skipped = testCases.filter((t) => t.status === 'skipped').length;
  const errors = testCases.filter((t) => t.status === 'error').length;
  const duration = testCases.reduce((sum, t) => sum + (t.duration || 0), 0);

  return db.updateScan(scanId, {
    status: 'completed',
    completedAt: new Date(),
    summary: {
      total: testCases.length,
      passed,
      failed,
      skipped,
      errors,
      duration,
    },
  });
}

/**
 * Fail a scan
 */
export async function failScan(scanId: string): Promise<db.Scan | null> {
  return db.updateScan(scanId, {
    status: 'failed',
    completedAt: new Date(),
  });
}

/**
 * Cancel a scan
 */
export async function cancelScan(scanId: string): Promise<db.Scan | null> {
  return db.updateScan(scanId, {
    status: 'cancelled',
    completedAt: new Date(),
  });
}

/**
 * Batch create test cases
 */
export async function batchCreateTestCases(
  testCases: Array<Omit<db.ScanTestCase, 'id' | 'createdAt'>>
): Promise<db.ScanTestCase[]> {
  const results: db.ScanTestCase[] = [];

  for (const tc of testCases) {
    const created = await db.createTestCase(tc);
    results.push(created);
  }

  return results;
}

/**
 * Get full scan details with test cases and issues
 */
export async function getScanDetails(scanId: string): Promise<{
  scan: db.Scan;
  testCases: db.ScanTestCase[];
  issues: db.ScanIssue[];
} | null> {
  const scan = await db.getScan(scanId);
  if (!scan) return null;

  const [testCases, issues] = await Promise.all([
    db.getTestCasesByScan(scanId),
    db.getIssuesByScan(scanId),
  ]);

  return { scan, testCases, issues };
}

// ============================================================================
// Compatibility Shims (for legacy API routes using store pattern)
// ============================================================================

// In-memory cache for compatibility with old store pattern
const cache = {
  projects: new Map<string, db.Project>(),
  scans: new Map<string, db.Scan>(),
  reports: new Map<string, db.Report>(),
};

// Project store compatibility
export const projectStore = {
  get: (id: string) => cache.projects.get(id),
  set: (id: string, project: db.Project) => cache.projects.set(id, project),
  list: (filter?: (p: db.Project) => boolean) => {
    const all = Array.from(cache.projects.values());
    return filter ? all.filter(filter) : all;
  },
};

// Scan store compatibility
export const scanStore = {
  get: (id: string) => cache.scans.get(id),
  set: (id: string, scan: db.Scan) => cache.scans.set(id, scan),
  list: (filter?: (s: db.Scan) => boolean) => {
    const all = Array.from(cache.scans.values());
    return filter ? all.filter(filter) : all;
  },
};

// Report store compatibility
export const reportStore = {
  get: (id: string) => cache.reports.get(id),
  set: (id: string, report: db.Report) => cache.reports.set(id, report),
  list: (filter?: (r: db.Report) => boolean) => {
    const all = Array.from(cache.reports.values());
    return filter ? all.filter(filter) : all;
  },
};

// Get reports by project
export function getReportsByProject(projectId: string): db.Report[] {
  return reportStore.list((r) => r.projectId === projectId);
}

// Generate report (sync version for compatibility)
export function generateReport(scanId: string): db.Report | null {
  const scan = scanStore.get(scanId);
  if (!scan) return null;

  const report: db.Report = {
    id: generateId('rpt'),
    scanId,
    projectId: scan.projectId,
    organizationId: scan.organizationId,
    generatedAt: new Date(),
    summary: {
      totalTests: scan.summary?.total || 0,
      passed: scan.summary?.passed || 0,
      failed: scan.summary?.failed || 0,
      skipped: scan.summary?.skipped || 0,
      errors: scan.summary?.errors || 0,
      duration: scan.summary?.duration || 0,
      passRate: scan.summary?.total
        ? Math.round(((scan.summary?.passed || 0) / scan.summary.total) * 100)
        : 0,
    },
    issues: [],
  };

  reportStore.set(report.id, report);
  return report;
}

/**
 * Submit test results (creates scan + test cases + issues in one operation)
 */
export async function submitTestResults(
  organizationId: string,
  data: {
    projectId: string;
    platform: db.Platform;
    branch?: string;
    commitSha?: string;
    testCases: Array<{
      name: string;
      suite?: string;
      status: db.TestStatus;
      duration?: number;
      error?: string;
      steps?: string[];
      metadata?: Record<string, unknown>;
    }>;
    metadata?: Record<string, unknown>;
  }
): Promise<{
  scan: db.Scan;
  testCases: db.ScanTestCase[];
  summary: db.Scan['summary'];
}> {
  // Create the scan
  const scan = await db.createScan({
    projectId: data.projectId,
    organizationId,
    platform: data.platform,
    branch: data.branch,
    commitSha: data.commitSha,
    status: 'running',
    startedAt: new Date(),
    metadata: data.metadata,
  });

  // Create test cases
  const testCases: db.ScanTestCase[] = [];
  for (const tc of data.testCases) {
    const created = await db.createTestCase({
      scanId: scan.id,
      projectId: data.projectId,
      organizationId,
      name: tc.name,
      suite: tc.suite,
      status: tc.status,
      duration: tc.duration,
      error: tc.error,
      steps: tc.steps,
      metadata: tc.metadata,
    });
    testCases.push(created);

    // Create issues for failed tests
    if (tc.status === 'failed' || tc.status === 'error') {
      await db.createIssue({
        scanId: scan.id,
        projectId: data.projectId,
        organizationId,
        testCaseId: created.id,
        title: `Test failed: ${tc.name}`,
        description: tc.error,
        severity: tc.status === 'error' ? 'high' : 'medium',
        type: tc.status === 'error' ? 'error' : 'failure',
      });
    }
  }

  // Complete the scan with summary
  const completedScan = await completeScan(scan.id, testCases);

  return {
    scan: completedScan || scan,
    testCases,
    summary: completedScan?.summary,
  };
}
