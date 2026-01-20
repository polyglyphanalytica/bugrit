// Firestore operations for Test Scripts

import {
  getDb,
  COLLECTIONS,
  toDate,
  toTimestamp,
  generateId,
} from '../firestore';
import { TestScript, RunnerType, BrowserType, NativePlatform } from '../types';
import { store } from '../store';

/**
 * Get all test scripts
 */
export async function getAllTestScripts(): Promise<TestScript[]> {
  const db = getDb();

  if (!db) {
    return store.getAllTestScripts();
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.TEST_SCRIPTS)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        code: data.code,
        targetUrl: data.targetUrl,
        appId: data.appId,
        buildId: data.buildId,
        tags: data.tags || [],
        isRegression: data.isRegression || false,
        status: data.status,
        runnerType: data.runnerType || 'playwright',
        targetPlatform: data.targetPlatform,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as TestScript;
    });
  } catch (error) {
    console.error('Error getting test scripts:', error);
    return store.getAllTestScripts();
  }
}

/**
 * Get regression test scripts
 */
export async function getRegressionScripts(): Promise<TestScript[]> {
  const db = getDb();

  if (!db) {
    return store.getRegressionScripts();
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.TEST_SCRIPTS)
      .where('isRegression', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        code: data.code,
        targetUrl: data.targetUrl,
        appId: data.appId,
        buildId: data.buildId,
        tags: data.tags || [],
        isRegression: true,
        status: data.status,
        runnerType: data.runnerType || 'playwright',
        targetPlatform: data.targetPlatform,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as TestScript;
    });
  } catch (error) {
    console.error('Error getting regression scripts:', error);
    return store.getRegressionScripts();
  }
}

/**
 * Get a single test script by ID
 */
export async function getTestScript(id: string): Promise<TestScript | null> {
  const db = getDb();

  if (!db) {
    return store.getTestScript(id) || null;
  }

  try {
    const doc = await db.collection(COLLECTIONS.TEST_SCRIPTS).doc(id).get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      code: data.code,
      targetUrl: data.targetUrl,
      appId: data.appId,
      buildId: data.buildId,
      tags: data.tags || [],
      isRegression: data.isRegression || false,
      status: data.status,
      runnerType: data.runnerType || 'playwright',
      targetPlatform: data.targetPlatform,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as TestScript;
  } catch (error) {
    console.error('Error getting test script:', error);
    return store.getTestScript(id) || null;
  }
}

/**
 * Create a new test script
 */
export async function createTestScript(
  script: Omit<TestScript, 'id' | 'createdAt' | 'updatedAt' | 'isRegression' | 'status'>
): Promise<TestScript> {
  const db = getDb();
  const id = generateId('ts');
  const now = new Date();

  const newScript: TestScript = {
    ...script,
    id,
    isRegression: false,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  if (!db) {
    return store.createTestScript(script);
  }

  try {
    await db.collection(COLLECTIONS.TEST_SCRIPTS).doc(id).set({
      name: newScript.name,
      description: newScript.description,
      code: newScript.code,
      targetUrl: newScript.targetUrl,
      appId: newScript.appId,
      buildId: newScript.buildId,
      tags: newScript.tags || [],
      isRegression: false,
      status: 'pending',
      runnerType: newScript.runnerType || 'playwright',
      targetPlatform: newScript.targetPlatform,
      createdAt: toTimestamp(now),
      updatedAt: toTimestamp(now),
    });

    return newScript;
  } catch (error) {
    console.error('Error creating test script:', error);
    return store.createTestScript(script);
  }
}

/**
 * Update a test script
 */
export async function updateTestScript(
  id: string,
  updates: Partial<Omit<TestScript, 'id' | 'createdAt'>>
): Promise<TestScript | null> {
  const db = getDb();

  if (!db) {
    const existing = store.getTestScript(id);
    if (!existing) return null;
    Object.assign(existing, updates, { updatedAt: new Date() });
    return existing;
  }

  try {
    const docRef = db.collection(COLLECTIONS.TEST_SCRIPTS).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const updateData: Record<string, unknown> = {
      ...updates,
      updatedAt: toTimestamp(new Date()),
    };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    await docRef.update(updateData);

    const updated = await docRef.get();
    const data = updated.data()!;

    return {
      id: updated.id,
      name: data.name,
      description: data.description,
      code: data.code,
      targetUrl: data.targetUrl,
      appId: data.appId,
      buildId: data.buildId,
      tags: data.tags || [],
      isRegression: data.isRegression || false,
      status: data.status,
      runnerType: data.runnerType || 'playwright',
      targetPlatform: data.targetPlatform,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as TestScript;
  } catch (error) {
    console.error('Error updating test script:', error);
    return null;
  }
}

/**
 * Promote a script to regression
 */
export async function promoteToRegression(id: string): Promise<TestScript | null> {
  const db = getDb();

  if (!db) {
    return store.promoteToRegression(id) || null;
  }

  return updateTestScript(id, { isRegression: true });
}

/**
 * Delete a test script
 */
export async function deleteTestScript(id: string): Promise<boolean> {
  const db = getDb();

  if (!db) {
    return store.deleteTestScript(id);
  }

  try {
    await db.collection(COLLECTIONS.TEST_SCRIPTS).doc(id).delete();
    return true;
  } catch (error) {
    console.error('Error deleting test script:', error);
    return false;
  }
}

/**
 * Get scripts by runner type
 */
export async function getScriptsByRunnerType(
  runnerType: RunnerType
): Promise<TestScript[]> {
  const db = getDb();

  if (!db) {
    return store.getAllTestScripts().filter((s) => s.runnerType === runnerType);
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.TEST_SCRIPTS)
      .where('runnerType', '==', runnerType)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        code: data.code,
        targetUrl: data.targetUrl,
        appId: data.appId,
        buildId: data.buildId,
        tags: data.tags || [],
        isRegression: data.isRegression || false,
        status: data.status,
        runnerType: data.runnerType,
        targetPlatform: data.targetPlatform,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as TestScript;
    });
  } catch (error) {
    console.error('Error getting scripts by runner type:', error);
    return [];
  }
}

/**
 * Get scripts by platform
 */
export async function getScriptsByPlatform(
  platform: NativePlatform
): Promise<TestScript[]> {
  const db = getDb();

  if (!db) {
    return store
      .getAllTestScripts()
      .filter((s) => s.targetPlatform === platform);
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.TEST_SCRIPTS)
      .where('targetPlatform', '==', platform)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        code: data.code,
        targetUrl: data.targetUrl,
        appId: data.appId,
        buildId: data.buildId,
        tags: data.tags || [],
        isRegression: data.isRegression || false,
        status: data.status,
        runnerType: data.runnerType,
        targetPlatform: data.targetPlatform,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as TestScript;
    });
  } catch (error) {
    console.error('Error getting scripts by platform:', error);
    return [];
  }
}
