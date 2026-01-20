// Firestore operations for Test Runs

import {
  getDb,
  COLLECTIONS,
  toDate,
  toTimestamp,
  generateId,
} from '../firestore';
import { TestRun } from '../types';
import { store } from '../store';

/**
 * Get all test runs
 */
export async function getAllTestRuns(): Promise<TestRun[]> {
  const db = getDb();

  if (!db) {
    return store.getAllTestRuns();
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.TEST_RUNS)
      .orderBy('startedAt', 'desc')
      .limit(100)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        testCaseId: data.testCaseId,
        testCaseName: data.testCaseName,
        status: data.status,
        duration: data.duration,
        startedAt: toDate(data.startedAt),
        completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
        error: data.error,
        logs: data.logs || [],
        platform: data.platform,
        browser: data.browser,
      } as TestRun;
    });
  } catch (error) {
    console.error('Error getting test runs:', error);
    return store.getAllTestRuns();
  }
}

/**
 * Get recent test runs
 */
export async function getRecentTestRuns(limit: number = 10): Promise<TestRun[]> {
  const db = getDb();

  if (!db) {
    return store.getRecentTestRuns(limit);
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.TEST_RUNS)
      .orderBy('startedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        testCaseId: data.testCaseId,
        testCaseName: data.testCaseName,
        status: data.status,
        duration: data.duration,
        startedAt: toDate(data.startedAt),
        completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
        error: data.error,
        logs: data.logs || [],
        platform: data.platform,
        browser: data.browser,
      } as TestRun;
    });
  } catch (error) {
    console.error('Error getting recent test runs:', error);
    return store.getRecentTestRuns(limit);
  }
}

/**
 * Get a single test run by ID
 */
export async function getTestRun(id: string): Promise<TestRun | null> {
  const db = getDb();

  if (!db) {
    return store.getTestRun(id) || null;
  }

  try {
    const doc = await db.collection(COLLECTIONS.TEST_RUNS).doc(id).get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      testCaseId: data.testCaseId,
      testCaseName: data.testCaseName,
      status: data.status,
      duration: data.duration,
      startedAt: toDate(data.startedAt),
      completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
      error: data.error,
      logs: data.logs || [],
      platform: data.platform,
      browser: data.browser,
    } as TestRun;
  } catch (error) {
    console.error('Error getting test run:', error);
    return store.getTestRun(id) || null;
  }
}

/**
 * Create a new test run
 */
export async function createTestRun(
  testRun: Omit<TestRun, 'id' | 'startedAt' | 'logs'>
): Promise<TestRun> {
  const db = getDb();
  const id = generateId('tr');
  const now = new Date();

  const newTestRun: TestRun = {
    ...testRun,
    id,
    startedAt: now,
    logs: [],
  };

  if (!db) {
    return store.createTestRun(testRun);
  }

  try {
    await db.collection(COLLECTIONS.TEST_RUNS).doc(id).set({
      testCaseId: newTestRun.testCaseId,
      testCaseName: newTestRun.testCaseName,
      status: newTestRun.status,
      duration: newTestRun.duration,
      startedAt: toTimestamp(now),
      completedAt: newTestRun.completedAt
        ? toTimestamp(newTestRun.completedAt)
        : null,
      error: newTestRun.error || null,
      logs: [],
      platform: newTestRun.platform || 'web',
      browser: newTestRun.browser || 'chromium',
    });

    return newTestRun;
  } catch (error) {
    console.error('Error creating test run:', error);
    return store.createTestRun(testRun);
  }
}

/**
 * Update a test run
 */
export async function updateTestRun(
  id: string,
  updates: Partial<Omit<TestRun, 'id' | 'startedAt'>>
): Promise<TestRun | null> {
  const db = getDb();

  if (!db) {
    return store.updateTestRun(id, updates) || null;
  }

  try {
    const docRef = db.collection(COLLECTIONS.TEST_RUNS).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const updateData: Record<string, unknown> = { ...updates };

    // Convert dates to timestamps
    if (updates.completedAt) {
      updateData.completedAt = toTimestamp(updates.completedAt);
    }

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    await docRef.update(updateData);

    // Return updated document
    const updated = await docRef.get();
    const data = updated.data()!;

    return {
      id: updated.id,
      testCaseId: data.testCaseId,
      testCaseName: data.testCaseName,
      status: data.status,
      duration: data.duration,
      startedAt: toDate(data.startedAt),
      completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
      error: data.error,
      logs: data.logs || [],
      platform: data.platform,
      browser: data.browser,
    } as TestRun;
  } catch (error) {
    console.error('Error updating test run:', error);
    return store.updateTestRun(id, updates) || null;
  }
}

/**
 * Add log entry to test run
 */
export async function addTestRunLog(id: string, log: string): Promise<boolean> {
  const db = getDb();

  if (!db) {
    const run = store.getTestRun(id);
    if (run) {
      run.logs.push(log);
      return true;
    }
    return false;
  }

  try {
    const { FieldValue } = await import('firebase-admin/firestore');
    await db
      .collection(COLLECTIONS.TEST_RUNS)
      .doc(id)
      .update({
        logs: FieldValue.arrayUnion(log),
      });
    return true;
  } catch (error) {
    console.error('Error adding test run log:', error);
    return false;
  }
}

/**
 * Complete a test run
 */
export async function completeTestRun(
  id: string,
  status: 'passed' | 'failed' | 'skipped',
  duration: number,
  error?: string
): Promise<TestRun | null> {
  return updateTestRun(id, {
    status,
    duration,
    completedAt: new Date(),
    error,
  });
}

/**
 * Get test runs for a specific test case
 */
export async function getTestRunsByTestCase(testCaseId: string): Promise<TestRun[]> {
  const db = getDb();

  if (!db) {
    return store.getAllTestRuns().filter((tr) => tr.testCaseId === testCaseId);
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.TEST_RUNS)
      .where('testCaseId', '==', testCaseId)
      .orderBy('startedAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        testCaseId: data.testCaseId,
        testCaseName: data.testCaseName,
        status: data.status,
        duration: data.duration,
        startedAt: toDate(data.startedAt),
        completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
        error: data.error,
        logs: data.logs || [],
        platform: data.platform,
        browser: data.browser,
      } as TestRun;
    });
  } catch (error) {
    console.error('Error getting test runs by test case:', error);
    return [];
  }
}

/**
 * Get dashboard statistics
 */
export async function getStats(): Promise<{
  totalTests: number;
  totalRuns: number;
  passing: number;
  failing: number;
  skipped: number;
  passRate: number;
}> {
  const db = getDb();

  if (!db) {
    return store.getStats();
  }

  try {
    // Get test case count
    const testCasesSnapshot = await db.collection(COLLECTIONS.TEST_CASES).count().get();
    const totalTests = testCasesSnapshot.data().count;

    // Get test run counts by status
    const runsSnapshot = await db
      .collection(COLLECTIONS.TEST_RUNS)
      .orderBy('startedAt', 'desc')
      .limit(1000)
      .get();

    const runs = runsSnapshot.docs;
    const totalRuns = runs.length;
    const passing = runs.filter((d) => d.data().status === 'passed').length;
    const failing = runs.filter((d) => d.data().status === 'failed').length;
    const skipped = runs.filter((d) => d.data().status === 'skipped').length;
    const passRate = totalRuns > 0 ? Math.round((passing / totalRuns) * 100) : 0;

    return {
      totalTests,
      totalRuns,
      passing,
      failing,
      skipped,
      passRate,
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return store.getStats();
  }
}
