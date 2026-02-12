// Firestore operations for Test Cases

import {
  getDb,
  COLLECTIONS,
  toDate,
  toTimestamp,
  generateId,
  isFirestoreConfigured,
} from '../firestore';
import { TestCase, TestStep } from '../types';
import { store } from '../store';
import { devConsole } from '@/lib/console';

/**
 * Get all test cases
 */
export async function getAllTestCases(): Promise<TestCase[]> {
  const db = getDb();

  // Fallback to in-memory store if Firestore not configured
  if (!db) {
    return store.getAllTestCases();
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.TEST_CASES)
      .orderBy('updatedAt', 'desc')
      .limit(1000)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: data.status,
        steps: data.steps || [],
        expectedResult: data.expectedResult,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as TestCase;
    });
  } catch (error) {
    devConsole.error('Error getting test cases:', error);
    return store.getAllTestCases(); // Fallback
  }
}

/**
 * Get a single test case by ID
 */
export async function getTestCase(id: string): Promise<TestCase | null> {
  const db = getDb();

  if (!db) {
    return store.getTestCase(id) || null;
  }

  try {
    const doc = await db.collection(COLLECTIONS.TEST_CASES).doc(id).get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: data.status,
      steps: data.steps || [],
      expectedResult: data.expectedResult,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as TestCase;
  } catch (error) {
    devConsole.error('Error getting test case:', error);
    return store.getTestCase(id) || null;
  }
}

/**
 * Create a new test case
 */
export async function createTestCase(
  testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TestCase> {
  const db = getDb();
  const id = generateId('tc');
  const now = new Date();

  const newTestCase: TestCase = {
    ...testCase,
    id,
    createdAt: now,
    updatedAt: now,
  };

  if (!db) {
    return store.createTestCase(testCase);
  }

  try {
    await db.collection(COLLECTIONS.TEST_CASES).doc(id).set({
      name: newTestCase.name,
      description: newTestCase.description,
      category: newTestCase.category,
      priority: newTestCase.priority,
      status: newTestCase.status,
      steps: newTestCase.steps,
      expectedResult: newTestCase.expectedResult,
      createdAt: toTimestamp(now),
      updatedAt: toTimestamp(now),
    });

    return newTestCase;
  } catch (error) {
    devConsole.error('Error creating test case:', error);
    return store.createTestCase(testCase);
  }
}

/**
 * Update a test case
 */
export async function updateTestCase(
  id: string,
  updates: Partial<Omit<TestCase, 'id' | 'createdAt'>>
): Promise<TestCase | null> {
  const db = getDb();

  if (!db) {
    return store.updateTestCase(id, updates) || null;
  }

  try {
    const docRef = db.collection(COLLECTIONS.TEST_CASES).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const updateData: Record<string, unknown> = {
      ...updates,
      updatedAt: toTimestamp(new Date()),
    };

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
      name: data.name,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: data.status,
      steps: data.steps || [],
      expectedResult: data.expectedResult,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    } as TestCase;
  } catch (error) {
    devConsole.error('Error updating test case:', error);
    return store.updateTestCase(id, updates) || null;
  }
}

/**
 * Delete a test case
 */
export async function deleteTestCase(id: string): Promise<boolean> {
  const db = getDb();

  if (!db) {
    return store.deleteTestCase(id);
  }

  try {
    await db.collection(COLLECTIONS.TEST_CASES).doc(id).delete();
    return true;
  } catch (error) {
    devConsole.error('Error deleting test case:', error);
    return false;
  }
}

/**
 * Get test cases by category
 */
export async function getTestCasesByCategory(category: string): Promise<TestCase[]> {
  const db = getDb();

  if (!db) {
    return store.getAllTestCases().filter((tc) => tc.category === category);
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.TEST_CASES)
      .where('category', '==', category)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: data.status,
        steps: data.steps || [],
        expectedResult: data.expectedResult,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as TestCase;
    });
  } catch (error) {
    devConsole.error('Error getting test cases by category:', error);
    return [];
  }
}

/**
 * Get test cases by status
 */
export async function getTestCasesByStatus(
  status: 'active' | 'inactive' | 'draft'
): Promise<TestCase[]> {
  const db = getDb();

  if (!db) {
    return store.getAllTestCases().filter((tc) => tc.status === status);
  }

  try {
    const snapshot = await db
      .collection(COLLECTIONS.TEST_CASES)
      .where('status', '==', status)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: data.status,
        steps: data.steps || [],
        expectedResult: data.expectedResult,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as TestCase;
    });
  } catch (error) {
    devConsole.error('Error getting test cases by status:', error);
    return [];
  }
}

/**
 * Search test cases
 * Note: For production with large datasets, consider Algolia or Elasticsearch
 */
export async function searchTestCases(query: string, limit: number = 100): Promise<TestCase[]> {
  // Note: Firestore doesn't support full-text search
  // This implementation fetches limited records and filters client-side
  // For production, consider Algolia or Elasticsearch
  const allCases = await getAllTestCases();
  const lowerQuery = query.toLowerCase();

  return allCases
    .filter(
      (tc) =>
        tc.name.toLowerCase().includes(lowerQuery) ||
        tc.description.toLowerCase().includes(lowerQuery) ||
        tc.category.toLowerCase().includes(lowerQuery)
    )
    .slice(0, limit);
}
