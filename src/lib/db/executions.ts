// Firestore operations for Test Executions

import {
  getDb,
  COLLECTIONS,
  toDate,
  toTimestamp,
  generateId,
} from '../firestore';
import { TestExecution, ExecutionResult, BrowserType } from '../types';
import { store } from '../store';
import { safeRequire } from '@/lib/utils/safe-require';

/**
 * Get all executions
 */
export async function getAllExecutions(): Promise<TestExecution[]> {
  const db = getDb();

  if (!db) {
    return store.getAllExecutions();
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.EXECUTIONS)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        scriptIds: data.scriptIds || [],
        browsers: data.browsers || [],
        nativePlatforms: data.nativePlatforms || [],
        status: data.status,
        results: (data.results || []).map((r: Record<string, unknown>) => ({
          scriptId: r.scriptId as string,
          browser: r.browser as BrowserType,
          platform: r.platform as string,
          status: r.status as string,
          duration: r.duration as number,
          error: r.error as string | undefined,
          logs: r.logs as string[] | undefined,
        })),
        createdAt: toDate(data.createdAt),
        startedAt: data.startedAt ? toDate(data.startedAt) : undefined,
        completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
      } as TestExecution;
    });
  } catch (error) {
    console.error('Error getting executions:', error);
    return store.getAllExecutions();
  }
}

/**
 * Get a single execution by ID
 */
export async function getExecution(id: string): Promise<TestExecution | null> {
  const db = getDb();

  if (!db) {
    return store.getExecution(id) || null;
  }

  try {
    const doc = await db.collection(COLLECTIONS.EXECUTIONS).doc(id).get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      scriptIds: data.scriptIds || [],
      browsers: data.browsers || [],
      nativePlatforms: data.nativePlatforms || [],
      status: data.status,
      results: (data.results || []).map((r: Record<string, unknown>) => ({
        scriptId: r.scriptId as string,
        browser: r.browser as BrowserType,
        platform: r.platform as string,
        status: r.status as string,
        duration: r.duration as number,
        error: r.error as string | undefined,
        logs: r.logs as string[] | undefined,
      })),
      createdAt: toDate(data.createdAt),
      startedAt: data.startedAt ? toDate(data.startedAt) : undefined,
      completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
    } as TestExecution;
  } catch (error) {
    console.error('Error getting execution:', error);
    return store.getExecution(id) || null;
  }
}

/**
 * Create a new execution
 */
export async function createExecution(
  execution: Omit<TestExecution, 'id' | 'createdAt' | 'results' | 'status'>
): Promise<TestExecution> {
  const db = getDb();
  const id = generateId('ex');
  const now = new Date();

  const newExecution: TestExecution = {
    ...execution,
    id,
    status: 'queued',
    results: [],
    createdAt: now,
  };

  if (!db) {
    return store.createExecution(execution);
  }

  try {
    await db.collection(COLLECTIONS.EXECUTIONS).doc(id).set({
      scriptIds: newExecution.scriptIds,
      browsers: newExecution.browsers || [],
      nativePlatforms: newExecution.nativePlatforms || [],
      status: 'queued',
      results: [],
      createdAt: toTimestamp(now),
      startedAt: null,
      completedAt: null,
    });

    return newExecution;
  } catch (error) {
    console.error('Error creating execution:', error);
    return store.createExecution(execution);
  }
}

/**
 * Update an execution
 */
export async function updateExecution(
  id: string,
  updates: Partial<Omit<TestExecution, 'id' | 'createdAt'>>
): Promise<TestExecution | null> {
  const db = getDb();

  if (!db) {
    return store.updateExecution(id, updates) || null;
  }

  try {
    const docRef = db.collection(COLLECTIONS.EXECUTIONS).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const updateData: Record<string, unknown> = { ...updates };

    if (updates.startedAt) {
      updateData.startedAt = toTimestamp(updates.startedAt);
    }
    if (updates.completedAt) {
      updateData.completedAt = toTimestamp(updates.completedAt);
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    await docRef.update(updateData);

    return getExecution(id);
  } catch (error) {
    console.error('Error updating execution:', error);
    return store.updateExecution(id, updates) || null;
  }
}

/**
 * Add a result to an execution
 */
export async function addExecutionResult(
  executionId: string,
  result: ExecutionResult
): Promise<TestExecution | null> {
  const db = getDb();

  if (!db) {
    return store.addExecutionResult(executionId, result) || null;
  }

  try {
    const { FieldValue } = safeRequire<typeof import('firebase-admin/firestore')>('firebase-admin/firestore');
    await db
      .collection(COLLECTIONS.EXECUTIONS)
      .doc(executionId)
      .update({
        results: FieldValue.arrayUnion(result),
      });

    return getExecution(executionId);
  } catch (error) {
    console.error('Error adding execution result:', error);
    return store.addExecutionResult(executionId, result) || null;
  }
}

/**
 * Start an execution
 */
export async function startExecution(id: string): Promise<TestExecution | null> {
  return updateExecution(id, {
    status: 'running',
    startedAt: new Date(),
  });
}

/**
 * Complete an execution
 */
export async function completeExecution(
  id: string,
  status: 'completed' | 'failed'
): Promise<TestExecution | null> {
  return updateExecution(id, {
    status,
    completedAt: new Date(),
  });
}

/**
 * Get pending executions
 */
export async function getPendingExecutions(): Promise<TestExecution[]> {
  const db = getDb();

  if (!db) {
    return store.getAllExecutions().filter((e) => e.status === 'queued');
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.EXECUTIONS)
      .where('status', '==', 'queued')
      .orderBy('createdAt', 'asc')
      .limit(10)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        scriptIds: data.scriptIds || [],
        browsers: data.browsers || [],
        nativePlatforms: data.nativePlatforms || [],
        status: data.status,
        results: data.results || [],
        createdAt: toDate(data.createdAt),
        startedAt: data.startedAt ? toDate(data.startedAt) : undefined,
        completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
      } as TestExecution;
    });
  } catch (error) {
    console.error('Error getting pending executions:', error);
    return [];
  }
}

/**
 * Get running executions
 */
export async function getRunningExecutions(): Promise<TestExecution[]> {
  const db = getDb();

  if (!db) {
    return store.getAllExecutions().filter((e) => e.status === 'running');
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.EXECUTIONS)
      .where('status', '==', 'running')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        scriptIds: data.scriptIds || [],
        browsers: data.browsers || [],
        nativePlatforms: data.nativePlatforms || [],
        status: data.status,
        results: data.results || [],
        createdAt: toDate(data.createdAt),
        startedAt: data.startedAt ? toDate(data.startedAt) : undefined,
        completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
      } as TestExecution;
    });
  } catch (error) {
    console.error('Error getting running executions:', error);
    return [];
  }
}
