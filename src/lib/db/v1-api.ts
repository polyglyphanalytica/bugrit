/**
 * V1 API Firestore Operations
 *
 * Database operations for the v1 API - projects, scans, tests, reports.
 * Integrated with organizations and subscription limits.
 */

import {
  getDb,
  COLLECTIONS,
  toDate,
  toTimestamp,
  generateId,
} from '../firestore';
import { TierName, TIERS } from '../subscriptions/tiers';

// Types for V1 API
export type Platform = 'web' | 'ios' | 'android' | 'desktop';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'error';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  platforms: Platform[];
  repositoryUrl?: string;
  githubInstallationId?: string; // For GitHub private repo access
  defaultBranch?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Scan {
  id: string;
  projectId: string;
  organizationId: string;
  status: ScanStatus;
  platform: Platform;
  branch?: string;
  commitSha?: string;
  startedAt?: Date;
  completedAt?: Date;
  summary?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    duration: number;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ScanTestCase {
  id: string;
  scanId: string;
  projectId: string;
  organizationId: string;
  name: string;
  suite?: string;
  status: TestStatus;
  duration?: number;
  error?: string;
  steps?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ScanIssue {
  id: string;
  scanId: string;
  projectId: string;
  organizationId: string;
  testCaseId?: string;
  title: string;
  description?: string;
  severity: Severity;
  type: string;
  location?: {
    file?: string;
    line?: number;
    column?: number;
  };
  createdAt: Date;
}

export interface Report {
  id: string;
  scanId: string;
  projectId: string;
  organizationId: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    passRate: number;
    duration: number;
  };
  issues: ScanIssue[];
  generatedAt: Date;
}

// Rate limits by tier (requests per minute)
export const TIER_RATE_LIMITS: Record<TierName, number> = {
  free: 10,
  pro: 60,
  business: 300,
};

// In-memory fallback stores
const projectStore = new Map<string, Project>();
const scanStore = new Map<string, Scan>();
const testCaseStore = new Map<string, ScanTestCase>();
const issueStore = new Map<string, ScanIssue>();
const reportStore = new Map<string, Report>();

// ==================== PROJECTS ====================

export async function createProject(
  data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Project> {
  const db = getDb();
  const id = generateId('prj');
  const now = new Date();

  const project: Project = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  if (!db) {
    projectStore.set(id, project);
    return project;
  }

  await db.collection(COLLECTIONS.PROJECTS).doc(id).set({
    ...project,
    createdAt: toTimestamp(now),
    updatedAt: toTimestamp(now),
  });

  return project;
}

export async function getProject(id: string): Promise<Project | null> {
  const db = getDb();

  if (!db) {
    return projectStore.get(id) || null;
  }

  const doc = await db.collection(COLLECTIONS.PROJECTS).doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    organizationId: data.organizationId,
    name: data.name,
    description: data.description,
    platforms: data.platforms,
    repositoryUrl: data.repositoryUrl,
    githubInstallationId: data.githubInstallationId,
    defaultBranch: data.defaultBranch,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getProjectsByOrganization(
  organizationId: string
): Promise<Project[]> {
  const db = getDb();

  if (!db) {
    return Array.from(projectStore.values()).filter(
      (p) => p.organizationId === organizationId
    );
  }

  const snapshot = await db
    .collection(COLLECTIONS.PROJECTS)
    .where('organizationId', '==', organizationId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      organizationId: data.organizationId,
      name: data.name,
      description: data.description,
      platforms: data.platforms,
      repositoryUrl: data.repositoryUrl,
      githubInstallationId: data.githubInstallationId,
      defaultBranch: data.defaultBranch,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  });
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'organizationId' | 'createdAt'>>
): Promise<Project | null> {
  const db = getDb();
  const now = new Date();

  if (!db) {
    const existing = projectStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: now };
    projectStore.set(id, updated);
    return updated;
  }

  const docRef = db.collection(COLLECTIONS.PROJECTS).doc(id);
  await docRef.update({
    ...updates,
    updatedAt: toTimestamp(now),
  });

  return getProject(id);
}

export async function deleteProject(id: string): Promise<boolean> {
  const db = getDb();

  if (!db) {
    return projectStore.delete(id);
  }

  await db.collection(COLLECTIONS.PROJECTS).doc(id).delete();
  return true;
}

// ==================== SCANS ====================

export async function createScan(
  data: Omit<Scan, 'id' | 'createdAt'>
): Promise<Scan> {
  const db = getDb();
  const id = generateId('scn');
  const now = new Date();

  const scan: Scan = {
    ...data,
    id,
    createdAt: now,
  };

  if (!db) {
    scanStore.set(id, scan);
    return scan;
  }

  await db.collection(COLLECTIONS.SCANS).doc(id).set({
    ...scan,
    createdAt: toTimestamp(now),
    startedAt: scan.startedAt ? toTimestamp(scan.startedAt) : null,
    completedAt: scan.completedAt ? toTimestamp(scan.completedAt) : null,
  });

  return scan;
}

export async function getScan(id: string): Promise<Scan | null> {
  const db = getDb();

  if (!db) {
    return scanStore.get(id) || null;
  }

  const doc = await db.collection(COLLECTIONS.SCANS).doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    projectId: data.projectId,
    organizationId: data.organizationId,
    status: data.status,
    platform: data.platform,
    branch: data.branch,
    commitSha: data.commitSha,
    startedAt: data.startedAt ? toDate(data.startedAt) : undefined,
    completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
    summary: data.summary,
    metadata: data.metadata,
    createdAt: toDate(data.createdAt),
  };
}

export async function getScansByProject(
  projectId: string,
  limit: number = 50
): Promise<Scan[]> {
  const db = getDb();

  if (!db) {
    return Array.from(scanStore.values())
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  const snapshot = await db
    .collection(COLLECTIONS.SCANS)
    .where('projectId', '==', projectId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      projectId: data.projectId,
      organizationId: data.organizationId,
      status: data.status,
      platform: data.platform,
      branch: data.branch,
      commitSha: data.commitSha,
      startedAt: data.startedAt ? toDate(data.startedAt) : undefined,
      completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
      summary: data.summary,
      metadata: data.metadata,
      createdAt: toDate(data.createdAt),
    };
  });
}

export async function getScansByOrganization(
  organizationId: string,
  limit: number = 50
): Promise<Scan[]> {
  const db = getDb();

  if (!db) {
    return Array.from(scanStore.values())
      .filter((s) => s.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  const snapshot = await db
    .collection(COLLECTIONS.SCANS)
    .where('organizationId', '==', organizationId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      projectId: data.projectId,
      organizationId: data.organizationId,
      status: data.status,
      platform: data.platform,
      branch: data.branch,
      commitSha: data.commitSha,
      startedAt: data.startedAt ? toDate(data.startedAt) : undefined,
      completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
      summary: data.summary,
      metadata: data.metadata,
      createdAt: toDate(data.createdAt),
    };
  });
}

export async function updateScan(
  id: string,
  updates: Partial<Omit<Scan, 'id' | 'projectId' | 'organizationId' | 'createdAt'>>
): Promise<Scan | null> {
  const db = getDb();

  if (!db) {
    const existing = scanStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    scanStore.set(id, updated);
    return updated;
  }

  const docRef = db.collection(COLLECTIONS.SCANS).doc(id);
  const updateData: Record<string, unknown> = { ...updates };
  if (updates.startedAt) updateData.startedAt = toTimestamp(updates.startedAt);
  if (updates.completedAt) updateData.completedAt = toTimestamp(updates.completedAt);

  await docRef.update(updateData);
  return getScan(id);
}

// ==================== TEST CASES ====================

export async function createTestCase(
  data: Omit<ScanTestCase, 'id' | 'createdAt'>
): Promise<ScanTestCase> {
  const db = getDb();
  const id = generateId('tst');
  const now = new Date();

  const testCase: ScanTestCase = {
    ...data,
    id,
    createdAt: now,
  };

  if (!db) {
    testCaseStore.set(id, testCase);
    return testCase;
  }

  await db.collection(COLLECTIONS.SCAN_TEST_CASES).doc(id).set({
    ...testCase,
    createdAt: toTimestamp(now),
  });

  return testCase;
}

export async function getTestCase(id: string): Promise<ScanTestCase | null> {
  const db = getDb();

  if (!db) {
    return testCaseStore.get(id) || null;
  }

  const doc = await db.collection(COLLECTIONS.SCAN_TEST_CASES).doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    scanId: data.scanId,
    projectId: data.projectId,
    organizationId: data.organizationId,
    name: data.name,
    suite: data.suite,
    status: data.status,
    duration: data.duration,
    error: data.error,
    steps: data.steps,
    metadata: data.metadata,
    createdAt: toDate(data.createdAt),
  };
}

export async function getTestCasesByScan(scanId: string): Promise<ScanTestCase[]> {
  const db = getDb();

  if (!db) {
    return Array.from(testCaseStore.values()).filter((t) => t.scanId === scanId);
  }

  const snapshot = await db
    .collection(COLLECTIONS.SCAN_TEST_CASES)
    .where('scanId', '==', scanId)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      scanId: data.scanId,
      projectId: data.projectId,
      organizationId: data.organizationId,
      name: data.name,
      suite: data.suite,
      status: data.status,
      duration: data.duration,
      error: data.error,
      steps: data.steps,
      metadata: data.metadata,
      createdAt: toDate(data.createdAt),
    };
  });
}

export async function updateTestCase(
  id: string,
  updates: Partial<Omit<ScanTestCase, 'id' | 'scanId' | 'projectId' | 'organizationId' | 'createdAt'>>
): Promise<ScanTestCase | null> {
  const db = getDb();

  if (!db) {
    const existing = testCaseStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    testCaseStore.set(id, updated);
    return updated;
  }

  await db.collection(COLLECTIONS.SCAN_TEST_CASES).doc(id).update(updates);
  return getTestCase(id);
}

export async function deleteTestCase(id: string): Promise<boolean> {
  const db = getDb();

  if (!db) {
    return testCaseStore.delete(id);
  }

  await db.collection(COLLECTIONS.SCAN_TEST_CASES).doc(id).delete();
  return true;
}

// ==================== ISSUES ====================

export async function createIssue(
  data: Omit<ScanIssue, 'id' | 'createdAt'>
): Promise<ScanIssue> {
  const db = getDb();
  const id = generateId('iss');
  const now = new Date();

  const issue: ScanIssue = {
    ...data,
    id,
    createdAt: now,
  };

  if (!db) {
    issueStore.set(id, issue);
    return issue;
  }

  await db.collection(COLLECTIONS.SCAN_ISSUES).doc(id).set({
    ...issue,
    createdAt: toTimestamp(now),
  });

  return issue;
}

export async function getIssuesByScan(scanId: string): Promise<ScanIssue[]> {
  const db = getDb();

  if (!db) {
    return Array.from(issueStore.values()).filter((i) => i.scanId === scanId);
  }

  const snapshot = await db
    .collection(COLLECTIONS.SCAN_ISSUES)
    .where('scanId', '==', scanId)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      scanId: data.scanId,
      projectId: data.projectId,
      organizationId: data.organizationId,
      testCaseId: data.testCaseId,
      title: data.title,
      description: data.description,
      severity: data.severity,
      type: data.type,
      location: data.location,
      createdAt: toDate(data.createdAt),
    };
  });
}

// ==================== REPORTS ====================

export async function createReport(
  data: Omit<Report, 'id' | 'generatedAt'>
): Promise<Report> {
  const db = getDb();
  const id = generateId('rpt');
  const now = new Date();

  const report: Report = {
    ...data,
    id,
    generatedAt: now,
  };

  if (!db) {
    reportStore.set(id, report);
    return report;
  }

  await db.collection(COLLECTIONS.REPORTS).doc(id).set({
    ...report,
    generatedAt: toTimestamp(now),
  });

  return report;
}

export async function getReport(id: string): Promise<Report | null> {
  const db = getDb();

  if (!db) {
    return reportStore.get(id) || null;
  }

  const doc = await db.collection(COLLECTIONS.REPORTS).doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    id: doc.id,
    scanId: data.scanId,
    projectId: data.projectId,
    organizationId: data.organizationId,
    summary: data.summary,
    issues: data.issues,
    generatedAt: toDate(data.generatedAt),
  };
}

export async function getReportByScan(scanId: string): Promise<Report | null> {
  const db = getDb();

  if (!db) {
    return Array.from(reportStore.values()).find((r) => r.scanId === scanId) || null;
  }

  const snapshot = await db
    .collection(COLLECTIONS.REPORTS)
    .where('scanId', '==', scanId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    scanId: data.scanId,
    projectId: data.projectId,
    organizationId: data.organizationId,
    summary: data.summary,
    issues: data.issues,
    generatedAt: toDate(data.generatedAt),
  };
}

export async function getReportsByOrganization(
  organizationId: string,
  limit: number = 50
): Promise<Report[]> {
  const db = getDb();

  if (!db) {
    return Array.from(reportStore.values())
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  const snapshot = await db
    .collection(COLLECTIONS.REPORTS)
    .where('organizationId', '==', organizationId)
    .orderBy('generatedAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      scanId: data.scanId,
      projectId: data.projectId,
      organizationId: data.organizationId,
      summary: data.summary,
      issues: data.issues,
      generatedAt: toDate(data.generatedAt),
    };
  });
}

// ==================== HELPERS ====================

export async function generateReportFromScan(scanId: string): Promise<Report | null> {
  const scan = await getScan(scanId);
  if (!scan || scan.status !== 'completed') return null;

  const testCases = await getTestCasesByScan(scanId);
  const issues = await getIssuesByScan(scanId);

  const summary = {
    totalTests: testCases.length,
    passed: testCases.filter((t) => t.status === 'passed').length,
    failed: testCases.filter((t) => t.status === 'failed').length,
    skipped: testCases.filter((t) => t.status === 'skipped').length,
    errors: testCases.filter((t) => t.status === 'error').length,
    passRate: testCases.length > 0
      ? (testCases.filter((t) => t.status === 'passed').length / testCases.length) * 100
      : 0,
    duration: testCases.reduce((sum, t) => sum + (t.duration || 0), 0),
  };

  return createReport({
    scanId,
    projectId: scan.projectId,
    organizationId: scan.organizationId,
    summary,
    issues,
  });
}

// ==================== SUBSCRIPTION LIMITS ====================

export async function checkProjectLimit(
  organizationId: string,
  tier: TierName
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const projects = await getProjectsByOrganization(organizationId);
  const limit = TIERS[tier].limits.projects;
  const isUnlimited = limit === -1;

  return {
    allowed: isUnlimited || projects.length < limit,
    current: projects.length,
    limit: isUnlimited ? -1 : limit,
  };
}

export async function checkScanLimit(
  organizationId: string,
  tier: TierName,
  scansThisMonth: number
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limit = TIERS[tier].limits.scansPerMonth;
  const isUnlimited = limit === -1;

  return {
    allowed: isUnlimited || scansThisMonth < limit,
    current: scansThisMonth,
    limit: isUnlimited ? -1 : limit,
  };
}

export function checkPlatformAccess(tier: TierName, platform: Platform): boolean {
  const platformMap: Record<Platform, 'web' | 'mobile' | 'desktop'> = {
    web: 'web',
    ios: 'mobile',
    android: 'mobile',
    desktop: 'desktop',
  };
  return TIERS[tier].limits.platforms[platformMap[platform]];
}
